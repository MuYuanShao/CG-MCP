"""Phase-three checks, called only by the owning disposable dual-system harness."""
import copy
import datetime as dt
import hashlib
import json
import secrets
import uuid
from decimal import Decimal


def check_phase3(h, mcp, spd, supplier, company):
    api, sql, check, wait, request = h.api, h.sql, h.check, h.wait, h.request
    mcp_url, spd_url, instance, secret = h.MCP_URL, h.SPD_URL, h.INSTANCE, h.SECRET
    base = f"/integration/instances/{instance}/phase3"
    connection = {"configType": "integration", "scopeType": "global", "scopeId": "default", "configKey": "integration.mcp-ui.connection", "configValue": json.dumps({"protocol": "http", "host": "127.0.0.1", "port": h.MCP_PORT, "phase2Enabled": True, "phase3Enabled": True}), "effectiveMode": "realtime", "expireTime": "", "riskLevel": "low", "status": 1}
    settings = api(spd_url, "/system-config?configType=integration&keyword=integration.mcp-ui.connection", token=spd)
    connection_id = next(c["configId"] for c in settings if c["configKey"] == "integration.mcp-ui.connection")
    api(spd_url, f"/system-config/{connection_id}", "PUT", connection, spd)
    key = secrets.token_hex(4)
    counter = 0

    def listing(kind, query="", token=mcp):
        return api(mcp_url, f"{base}/{kind}?page=1&size=200&query={query}", token=token)

    def document(kind, source):
        return next((row for row in listing(kind)["rows"] if row["sourceId"] == str(source)), None)

    def wire(kind, source):
        text = sql(f"SELECT wire_payload FROM mcp_phase3_outbox WHERE document_type='{kind}' AND source_id={int(source)} AND wire_payload IS NOT NULL ORDER BY revision DESC LIMIT 1;", "spd_it")
        return json.loads(text) if text else None

    def send(kind, value, method="POST", path=None):
        return request(mcp_url, path or f"{base}/{kind}", method, value, mcp, spd_token=secret, idempotency_key=value.get("messageId"))

    def admit(suffix, price, quota=False, high=False):
        code = f"P3_{key}_{suffix}"
        product = api(mcp_url, "/products", "POST", {"code": code, "name": code, "spec": "P3", "unitPrice": price, "unit": "支", "category": "低值耗材", "manufacturer": company, "distributor": supplier[1], "status": "active"}, mcp)
        result = api(mcp_url, f"/integration/instances/{instance}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": False}, mcp)
        check(result[0]["state"] == "processed", f"第三期样本{suffix}通过真实目录下发")
        application = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
        h.approve_application(spd, application)
        # Hospital-only classification is a fixture; MCP does not own these catalog attributes.
        sql(f"UPDATE product SET is_quota_managed={int(quota)},is_high_value={int(high)} WHERE product_code='{code}';", "spd_it")
        return code, int(sql(f"SELECT product_id FROM product WHERE product_code='{code}';", "spd_it"))

    def receive(code, quantity, target, supplier_name=supplier[1]):
        nonlocal counter
        counter += 1
        no = api(spd_url, "/receiving-orders", "POST", {"sourceType": "temporary", "supplierName": supplier_name, "warehouseCode": target["warehouse_code"], "receivingType": "normal", "items": [{"productCode": code, "quantity": quantity, "qualifiedQuantity": quantity, "unqualifiedQuantity": 0, "productionBatchNo": f"P3-{key}-{counter}", "expireDate": str(h.TODAY + dt.timedelta(days=365))}]}, spd)["receivingNo"]
        api(spd_url, f"/receiving-orders/{no}/action", "PUT", {"action": "approve"}, spd)
        return no, int(sql(f"SELECT batch_id FROM inventory_batch batch JOIN receiving_order ro ON ro.receiving_order_id=batch.receiving_order_id WHERE ro.receiving_no='{no}';", "spd_it"))

    def receipt_bill(receiving):
        return int(sql(f"SELECT item.settlement_id FROM settlement_bill_item item JOIN inventory_batch batch ON batch.batch_id=item.batch_id JOIN receiving_order ro ON ro.receiving_order_id=batch.receiving_order_id WHERE ro.receiving_no='{receiving}' AND item.source_biz_type='receiving_order_item' LIMIT 1;", "spd_it"))

    def source_bill_no(source):
        return sql(f"SELECT settlement_no FROM settlement_bill WHERE settlement_id={int(source)};", "spd_it")

    warehouse = json.loads(sql("SELECT JSON_OBJECT('warehouse_id',warehouse_id,'warehouse_code',warehouse_code,'warehouse_name',warehouse_name) FROM warehouse WHERE receiving_enabled=1 AND deleted=0 AND status=1 LIMIT 1;", "spd_it"))
    target = json.loads(sql("SELECT JSON_OBJECT('warehouse_id',w.warehouse_id,'warehouse_code',w.warehouse_code,'warehouse_name',w.warehouse_name,'dept_id',w.dept_id,'dept_name',d.dept_name) FROM warehouse w JOIN sys_dept d ON d.dept_id=w.dept_id WHERE w.deleted=0 AND w.status=1 ORDER BY w.warehouse_id LIMIT 1;", "spd_it"))
    sql(f"UPDATE warehouse SET receiving_enabled=1 WHERE warehouse_id={target['warehouse_id']};", "spd_it")
    code, product_id = admit("BASIC", 1.2345)
    native_count = sql("SELECT COUNT(*) FROM biz_purchase_order;", "mcp_it")
    demand = api(spd_url, "/purchase-orders/demands", "POST", {"items": [{"productCode": code, "quantity": 12}], "demandSource": "manual"}, spd)["demandNo"]
    for action in ("submit", "approve"):
        api(spd_url, f"/purchase-orders/demands/{demand}/action", "PUT", {"action": action}, spd)
    plan = api(spd_url, "/purchase-orders/plans/from-demands", "POST", {"demandNos": [demand], "supplierName": supplier[1]}, spd)["planNos"][0]
    for _ in range(12):
        if sql(f"SELECT plan_status FROM purchase_plan WHERE plan_no='{plan}';", "spd_it") == "approved":
            break
        api(spd_url, f"/purchase-orders/plans/{plan}/action", "PUT", {"action": "approve"}, spd)
    plan_id = int(sql(f"SELECT plan_id FROM purchase_plan WHERE plan_no='{plan}';", "spd_it"))
    planned = wait("第三期已批准计划通过持久消息上传", lambda: document("purchase-plans", plan_id))
    lines = api(mcp_url, f"{base}/purchase-plans/{plan_id}/items?page=1&size=20", token=mcp)
    check(lines["rows"][0]["plannedQuantity"] == "12" and lines["rows"][0]["estimatedAmount"] is None and lines["rows"][0]["estimatedUnitPrice"] is None, "来源未记录的计划估价保留null，数量保留12")
    order = api(spd_url, f"/purchase-orders/plans/{plan}/action", "PUT", {"action": "execute"}, spd)["orderNo"]
    wait("SPD转单状态及关联更新为更高计划版本", lambda: (row if row and row["sourceStatus"] == "executed" else None) if (row := document("purchase-plans", plan_id)) else None)
    uploaded_order = wait("上传订单保留来源计划身份", lambda: (r if r and r.get("sourcePlanId") == str(plan_id) else None) if (r := h.find_record(mcp, "order", order)) else None)
    check(uploaded_order["sourcePlanNo"] == plan and sql("SELECT COUNT(*) FROM biz_purchase_order;", "mcp_it") == native_count, "计划与订单只建立来源关系，不生成MCP原生订单")
    original = wire("purchase_plan", plan_id)
    status, replay = send("purchase-plans", original)
    check(status == 200 and replay["data"]["state"] == "processed", "第三期相同消息重试返回原回执")
    changed = copy.deepcopy(original); changed["payload"]["remark"] = "conflict"
    status, result = send("purchase-plans", changed)
    check(status == 409 and result["code"] == "IDEMPOTENCY_CONFLICT", "相同消息不同内容拒绝")
    changed["messageId"] = str(uuid.uuid4())
    status, result = send("purchase-plans", changed)
    check(status == 409 and result["code"] == "REVISION_CONFLICT", "相同来源版本不同内容拒绝")
    stale = copy.deepcopy(original); stale["messageId"] = str(uuid.uuid4()); stale["revision"] = str(int(original["revision"]) - 1)
    status, result = send("purchase-plans", stale)
    check(status == 200 and result["data"]["state"] == "ignored", "旧版本不覆盖新版本")

    received, _ = receive(code, 3, warehouse)
    bill = receipt_bill(received)
    imported = wait("入库结算真实四位金额同步", lambda: document("settlements", bill))
    check(imported["totalAmount"] == "3.7035" and imported["payload"]["settlementMode"] == "purchase_in", "三件乘1.2345以来源明细金额3.7035落库")
    # Unmapped supplier accounts must not inherit legacy integration:read access.
    sql("INSERT INTO sys_role(id,tenant_id,role_code,role_name) VALUES(900030,1,'phase3_supplier','第三期测试供应商'); INSERT INTO sys_role_permission(role_id,permission_id) SELECT 900030,id FROM sys_permission WHERE permission_code IN ('integration:phase3:read','integration:reconcile'); INSERT INTO sys_user(id,tenant_id,username,password_hash,real_name,status) SELECT 900030,1,'p3_supplier',password_hash,'第三期测试供应商',1 FROM sys_user WHERE tenant_id=1 AND username='e2e_admin'; INSERT INTO sys_user_role(user_id,role_id) VALUES(900030,900030);", "mcp_it")
    vendor = api(mcp_url, "/auth/login", "POST", {"username": "p3_supplier", "password": h.PASSWORD})["token"]
    status, _ = request(mcp_url, "/integration/instances", token=vendor)
    check(status == 403 and listing("settlements", token=vendor)["total"] == 0, "供应商未绑定时看不到结算，也无原对接区全量权限")
    api(mcp_url, f"{base}/supplier-access", "POST", {"username": "p3_supplier", "supplierCode": supplier[0]}, mcp)
    own = listing("settlements", token=vendor)
    check(any(row["sourceId"] == str(bill) for row in own["rows"]), "供应商绑定后可见本供应商结算")
    others = sql(f"SELECT supplier_name FROM supplier WHERE supplier_code<>'{supplier[0]}' AND deleted=0 AND status=1 LIMIT 1;", "spd_it")
    if others:
        other_receipt, _ = receive(code, 1, warehouse, others)
        other_bill = receipt_bill(other_receipt)
        wait("其他供应商结算同步用于隔离测试", lambda: document("settlements", other_bill))
        status, _ = request(mcp_url, f"{base}/settlements/{other_bill}/items", token=vendor)
        check(status == 404 and not any(row["sourceId"] == str(other_bill) for row in listing("settlements", token=vendor)["rows"]), "供应商不能查询其他供应商结算头或明细")
        status, _ = request(mcp_url, f"{base}/settlements/{other_bill}/feedback", "POST", {"revision": "1", "feedbackType": "received", "reason": ""}, vendor, idempotency_key=str(uuid.uuid4()))
        check(status == 404, "跨供应商反馈被拒绝")
    before_status = sql(f"SELECT status FROM settlement_bill WHERE settlement_id={bill};", "spd_it")
    before_qty = sql(f"SELECT SUM(available_qty) FROM inventory_balance WHERE product_id={product_id};", "spd_it")
    feedback_id = str(uuid.uuid4())
    feedback_body = {"revision": imported["revision"], "feedbackType": "received", "reason": ""}
    api(mcp_url, f"{base}/settlements/{bill}/feedback", "POST", feedback_body, vendor, idempotency_key=feedback_id)
    wait("供应商反馈通过持久任务到达SPD", lambda: sql(f"SELECT COUNT(*) FROM mcp_phase3_feedback WHERE message_id='{feedback_id}';", "spd_it") == "1")
    api(mcp_url, f"{base}/settlements/{bill}/feedback", "POST", feedback_body, vendor, idempotency_key=feedback_id)
    check(sql(f"SELECT COUNT(*) FROM mcp_phase3_feedback WHERE message_id='{feedback_id}';", "spd_it") == "1" and sql(f"SELECT status FROM settlement_bill WHERE settlement_id={bill};", "spd_it") == before_status and sql(f"SELECT SUM(available_qty) FROM inventory_balance WHERE product_id={product_id};", "spd_it") == before_qty, "反馈幂等且不改财务状态和库存")
    withdrawal_id = str(uuid.uuid4())
    withdrawal = {"revision": imported["revision"], "feedbackType": "withdrawn", "reason": "修正反馈"}
    api(mcp_url, f"{base}/settlements/{bill}/feedback", "POST", withdrawal, vendor, idempotency_key=withdrawal_id)
    wait("撤回反馈引用本人原消息并到达SPD", lambda: sql(f"SELECT COUNT(*) FROM mcp_phase3_feedback WHERE message_id='{withdrawal_id}' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.payload.withdrawsMessageId'))='{feedback_id}';", "spd_it") == "1")
    status, _ = request(mcp_url, f"{base}/settlements/{bill}/feedback", "POST", withdrawal, vendor, idempotency_key=str(uuid.uuid4()))
    check(status == 400, "已撤回反馈不能重复撤回")
    for _ in range(12):
        if sql(f"SELECT status FROM settlement_bill WHERE settlement_id={bill};", "spd_it") == "confirmed": break
        api(spd_url, f"/operational-closure/settlements/{source_bill_no(bill)}/confirm", "PUT", token=spd)
    wait("院内确认结算状态同步但不生成付款", lambda: (row if row and row["sourceStatus"] == "confirmed" else None) if (row := document("settlements", bill)) else None)
    immutable = copy.deepcopy(wire("settlement", bill)); immutable["messageId"] = str(uuid.uuid4()); immutable["revision"] = str(int(immutable["revision"]) + 1)
    immutable["payload"]["totalAmount"] = "9.0000"; immutable["payload"]["items"][0]["amount"] = "9.0000"
    status, result = send("settlements", immutable)
    check(status == 409 and result["code"] == "CONFIRMED_IMMUTABLE", "已确认结算不能由新版本改写财务事实")

    def unbilled_legacy(code, product, batch, count, price, suffix):
        """Seed an owned legacy confirmed consumption, preserving its stock and immutable movement facts."""
        no = f"P3_LEGACY_{key}_{suffix}"
        admin = int(sql("SELECT user_id FROM sys_user WHERE username='admin';", "spd_it"))
        sql(f"INSERT INTO department_consumption(consumption_no,dept_id,warehouse_id,consumption_type,related_biz_type,status,consume_by) VALUES('{no}',{target['dept_id']},{target['warehouse_id']},'department_consumption','inventory','confirmed',{admin});", "spd_it")
        dc = int(sql(f"SELECT consumption_id FROM department_consumption WHERE consumption_no='{no}';", "spd_it"))
        values = ",".join(f"({dc},{product},{batch},1,{price},{price})" for _ in range(count))
        sql("INSERT INTO department_consumption_item(consumption_id,product_id,batch_id,quantity,unit_price,amount) VALUES" + values + ";", "spd_it")
        start = Decimal(sql(f"SELECT available_qty FROM inventory_balance WHERE warehouse_id={target['warehouse_id']} AND batch_id={batch};", "spd_it"))
        movements = ",".join(f"('P3_{key}_{suffix}_{i}','department_consumption_out','department_consumption',{dc},{target['warehouse_id']},{product},{batch},-1,{start-i-1})" for i in range(count))
        sql("INSERT INTO inventory_event(event_no,event_type,source_biz_type,source_biz_id,warehouse_id,product_id,batch_id,qty_change,qty_after) VALUES" + movements + f"; UPDATE inventory_balance SET available_qty=available_qty-{count} WHERE warehouse_id={target['warehouse_id']} AND batch_id={batch};", "spd_it")
        return no

    dept_code, dept_product = admit("DEPT", 0.3333, quota=True)
    _, dept_batch = receive(dept_code, 3, target)
    first = unbilled_legacy(dept_code, dept_product, dept_batch, 1, "0.3333", "FIRST")
    second = unbilled_legacy(dept_code, dept_product, dept_batch, 1, "0.3333", "SECOND")
    generated = api(spd_url, "/operational-closure/settlements/generate", "POST", {"settlementMode": "department_consumption", "startDate": str(h.TODAY), "endDate": str(h.TODAY)}, spd)
    small = int(sql(f"SELECT settlement_id FROM settlement_bill WHERE settlement_no='{generated['settlementNos'][0]}';", "spd_it"))
    wait("科室消耗结算共享账单同步", lambda: document("settlements", small))
    check(document("settlements", small)["totalAmount"] == "0.6666", "共享账单保存两条来源金额精确合计")
    api(spd_url, f"/operational-closure/consumptions/{first}/reverse", "PUT", token=spd)
    wait("共享账单反消耗移除一条来源后保留剩余金额", lambda: (row if row and row["totalAmount"] == "0.3333" else None) if (row := document("settlements", small)) else None)
    api(spd_url, f"/operational-closure/consumptions/{second}/reverse", "PUT", token=spd)
    wait("空账单删除前保存取消消息并同步墓碑", lambda: (row if row and row["operation"] == "CANCEL" else None) if (row := document("settlements", small)) else None)
    check(sql(f"SELECT COUNT(*) FROM settlement_bill WHERE settlement_id={small};", "spd_it") == "0" and int(sql(f"SELECT COUNT(*) FROM mcp_phase3_outbox WHERE document_type='settlement' AND source_id={small} AND operation='CANCEL';", "spd_it")) == 1, "取消消息在源账单删除后仍持久保留")

    high_code, _ = admit("HIGH", 10, high=True)
    high_receipt, _ = receive(high_code, 1, warehouse)
    trace = api(spd_url, f"/udi-traceability/records?keyword={high_code}", token=spd)["rows"][0]
    api(spd_url, "/operational-closure/high-value/billing-callback", "POST", {"externalChargeNo": f"P3_{key}", "sourceSystem": "AIMS", "uniqueCode": trace["uniqueCode"], "patientNo": "P3_TEST_PATIENT", "deptName": "P3_TEST", "quantity": 1, "amount": 99.1234}, spd)
    high_bill = int(sql(f"SELECT item.settlement_id FROM settlement_bill_item item JOIN high_value_charge charge ON item.source_biz_type='high_value_charge' AND item.source_biz_id=charge.charge_id WHERE charge.external_charge_no='P3_{key}';", "spd_it"))
    high_row = wait("实际计费结算点同步", lambda: document("settlements", high_bill))
    check(high_row["totalAmount"] == "99.1234" and high_row["payload"]["settlementMode"] == "actual_sale" and "P3_TEST_PATIENT" not in json.dumps(wire("settlement", high_bill)), "高值结算沿用来源金额且不传患者信息")

    bulk_code, bulk_product = admit("BULK", 0.0001, quota=True)
    _, bulk_batch = receive(bulk_code, 1002, target)
    unbilled_legacy(bulk_code, bulk_product, bulk_batch, 1001, "0.0001", "BULK")
    generated = api(spd_url, "/operational-closure/settlements/generate", "POST", {"settlementMode": "department_consumption", "startDate": str(h.TODAY), "endDate": str(h.TODAY)}, spd)
    large = int(sql(f"SELECT settlement_id FROM settlement_bill WHERE settlement_no='{generated['settlementNos'][0]}';", "spd_it"))
    try:
        large_row = wait("1001行真实结算通过自动分片整单入站", lambda: document("settlements", large), 120)
    except Exception:
        print("PHASE3_DIAGNOSTIC " + sql(f"SELECT state,attempts,message FROM mcp_phase3_outbox WHERE document_type='settlement' AND source_id={large};", "spd_it"), flush=True)
        raise
    check(large_row["totalAmount"] == "0.1001" and len(wire("settlement", large)["payload"]["items"]) == 1001, "大单金额四位精确且没有截断")
    page = api(mcp_url, f"{base}/settlements/{large}/items?page=6&size=200", token=mcp)
    check(page["total"] == 1001 and len(page["rows"]) == 1 and page["page"] == 6, "大单明细分页返回真实1001条总数")

    # Independently exercise incomplete staging and part conflicts with a new source identity.
    staged = copy.deepcopy(wire("settlement", large)); staged["messageId"] = str(uuid.uuid4()); staged["sourceId"] = "99000066"; staged["revision"] = "1"; staged["payload"]["documentNo"] = "P3_STAGING_" + key
    for i, item in enumerate(staged["payload"]["items"]):
        item["sourceLineId"] = str(9007199254740993 + i); item["sourceBizId"] = str(9007199254750993 + i)
    canonical = lambda value: json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    digest = lambda value: hashlib.sha256(canonical(value)).hexdigest()
    header = copy.deepcopy(staged); header["payload"].pop("items")
    manifest = {"envelope": header, "payloadHash": digest(staged), "totalLines": 1001, "totalParts": 2}
    session = api(mcp_url, f"{base}/upload-sessions", "POST", manifest, mcp, spd_token=secret, idempotency_key=staged["messageId"])["sessionId"]
    part = {"items": staged["payload"]["items"][:1000]}; part["payloadHash"] = digest(part["items"])
    api(mcp_url, f"{base}/upload-sessions/{session}/parts/0", "PUT", part, mcp, spd_token=secret)
    status, _ = request(mcp_url, f"{base}/upload-sessions/{session}/commit", "POST", {}, mcp, spd_token=secret)
    check(status == 400 and document("settlements", 99000066) is None, "缺片大单不可见且不能提交")
    api(mcp_url, f"{base}/upload-sessions/{session}/parts/0", "PUT", part, mcp, spd_token=secret)
    bad_part = copy.deepcopy(part); bad_part["items"][0]["amount"] = "0.0002"; bad_part["payloadHash"] = digest(bad_part["items"])
    status, result = request(mcp_url, f"{base}/upload-sessions/{session}/parts/0", "PUT", bad_part, mcp, spd_token=secret)
    check(status == 409 and result["code"] == "PART_CONFLICT", "同一分片不能换内容")
    last = {"items": staged["payload"]["items"][1000:]}; last["payloadHash"] = digest(last["items"])
    api(mcp_url, f"{base}/upload-sessions/{session}/parts/1", "PUT", last, mcp, spd_token=secret)
    api(mcp_url, f"{base}/upload-sessions/{session}/commit", "POST", {}, mcp, spd_token=secret)
    big_id = api(mcp_url, f"{base}/settlements/99000066/items?page=1&size=20", token=mcp)["rows"][0]["sourceLineId"]
    check(big_id == "9007199254740993", "超过JavaScript安全整数的来源ID仍完整保留字符串")
    check(sql("SELECT COUNT(*) FROM biz_purchase_order;", "mcp_it") == native_count, "第三期计划结算和大单入站未写入MCP原生采购订单")
    receipt = api(mcp_url, f"{base}/messages/{staged['messageId']}", token=mcp, spd_token=secret)
    check(receipt["state"] == "processed", "大单已提交消息可查询持久回执")
    prior_revision = int(document("purchase-plans", plan_id)["revision"])
    api(spd_url, f"/mcp-phase3/republish/purchase_plan/{plan_id}", "POST", {}, spd)
    wait("管理员重新发布使用更高版本且保留来源身份", lambda: (row if row and int(row["revision"]) > prior_revision else None) if (row := document("purchase-plans", plan_id)) else None)
    api(spd_url, f"/mcp-phase3/republish/settlement/{small}", "POST", {}, spd)
    wait("已删除源账单仍可重新发布取消快照", lambda: sql(f"SELECT COUNT(*) FROM mcp_phase3_outbox WHERE document_type='settlement' AND source_id={small} AND operation='CANCEL' AND state='processed';", "spd_it") == "2")
