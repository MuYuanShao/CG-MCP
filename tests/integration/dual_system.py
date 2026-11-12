"""Real two-backend acceptance against an owned, isolated MySQL instance.

Credentials exist only in process memory. Existing databases/services are untouched.
Run after packaging both backend jars: python tests/integration/dual_system.py.
"""
import base64
import concurrent.futures
import bcrypt
import datetime as dt
from decimal import Decimal
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
SPD = Path(os.environ.get("SPD_PR_REPO", "D:/SPD-PR"))
MYSQL_BIN = Path(os.environ.get("SPD_TEST_MYSQL_BIN", "C:/Program Files/MySQL/MySQL Server 8.4/bin"))
RUN = ROOT / "test-results" / ("dual-system-" + dt.datetime.now().strftime("%Y%m%d-%H%M%S"))
MYSQL_PORT, MCP_PORT, SPD_PORT = 13326, 18080, 11818
MCP_URL, SPD_URL = f"http://127.0.0.1:{MCP_PORT}/api", f"http://127.0.0.1:{SPD_PORT}/api"
FLAGS = getattr(subprocess, "CREATE_NO_WINDOW", 0)
SECRET, PASSWORD, DB_PASSWORD = secrets.token_hex(32), secrets.token_hex(24), secrets.token_hex(24)
PROCESSES, HANDLES, RESULTS = [], [], []
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
INSTANCE = None


def emit(name, ok=True, detail=""):
    RESULTS.append({"name": name, "passed": ok, "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (": " + detail if detail else ""), flush=True)


def check(condition, name, detail=""):
    emit(name, bool(condition), detail)
    if not condition:
        raise RuntimeError(name + (": " + detail if detail else ""))


def sql(statement, database=None, password=DB_PASSWORD):
    args = [str(MYSQL_BIN / "mysql.exe"), "--no-defaults", "--protocol=TCP", "--host=127.0.0.1",
            f"--port={MYSQL_PORT}", "--user=root", "--default-character-set=utf8mb4", "--batch", "--raw", "--skip-column-names"]
    if database:
        assert database in {"mcp_it", "spd_it"}
        args.append(database)
    env = os.environ.copy()
    env["MYSQL_PWD"] = password
    run = subprocess.run(args, input=statement.encode("utf-8"), capture_output=True, env=env, creationflags=FLAGS)
    if run.returncode:
        error = run.stderr.decode("utf-8", errors="replace").replace(PASSWORD, "[redacted]").replace(DB_PASSWORD, "[redacted]")
        raise RuntimeError("Isolated SQL failed: " + error[:500])
    return run.stdout.decode("utf-8").strip()


def launch(args, log_name, env=None, cwd=ROOT):
    output = open(RUN / log_name, "wb")
    HANDLES.append(output)
    p = subprocess.Popen(args, cwd=cwd, env=env, stdout=output, stderr=subprocess.STDOUT, creationflags=FLAGS)
    PROCESSES.append(p)
    return p


def request(base, path, method="GET", body=None, token=None, spd_token=None, tenant=1, opener=None, raw=None, content_type=None, idempotency_key=None):
    headers = {"Content-Type": content_type or "application/json"}
    if base == MCP_URL:
        headers.update({"x-api-key": SECRET, "x-tenant-id": str(tenant)})
    if token:
        headers["Authorization"] = "Bearer " + token
    if spd_token:
        headers["x-spd-token"] = spd_token
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    data = raw if raw is not None else (None if body is None else json.dumps(body, ensure_ascii=False).encode())
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    def decode(response):
        payload = response.read()
        try:
            return json.loads(payload)
        except json.JSONDecodeError as error:
            raise RuntimeError(
                f"{method} {path}: HTTP {response.status}, non-JSON response ({len(payload)} bytes)"
            ) from error
    try:
        with (opener or urllib.request.build_opener()).open(req, timeout=40) as response:
            return response.status, decode(response)
    except urllib.error.HTTPError as error:
        return error.code, decode(error)


def api(base, path, method="GET", body=None, token=None, **kwargs):
    status, response = request(base, path, method, body, token, **kwargs)
    if status != 200 or response.get("code") not in {0, "SUCCESS"}:
        raise RuntimeError(f"{method} {path}: HTTP {status}, {response.get('message', '')}")
    return response.get("data")


def wait(name, predicate, timeout=90):
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        try:
            last = predicate()
            if last:
                emit(name)
                return last
        except (OSError, ValueError, RuntimeError) as error:
            last = str(error)
        time.sleep(1)
    raise RuntimeError(name + " timed out: " + str(last)[:250])


def health(base):
    try:
        return request(base, "/health")[0] == 200
    except Exception:
        return False


def mcp_records(token, kind):
    return api(MCP_URL, f"/integration/instances/{INSTANCE}/records/{kind}", token=token)


def find_record(token, kind, code):
    return next((r["payload"] for r in mcp_records(token, kind) if r["sourceCode"] == code), None)


def approve_application(token, number):
    for _ in range(12):
        detail = api(SPD_URL, f"/pending-product-applications/{number}", token=token)
        if detail["approvalStatus"] == "approved":
            return
        api(SPD_URL, f"/pending-product-applications/{number}/action", "PUT", {"action": "approve", "opinion": "隔离双端联调"}, token)
    raise RuntimeError("Pending product approval did not finish")


def check_category_api(mcp):
    category = api(MCP_URL, "/product-categories", "POST", {"categoryName": "低值耗材", "sortOrder": 10}, mcp)
    check(any(c["id"] == category["id"] for c in api(MCP_URL, "/product-categories", token=mcp)), "分类接口创建及查询真实落库")
    status, body = request(MCP_URL, "/product-categories", "POST", {"categoryName": " 低值耗材 ", "sortOrder": 20}, mcp)
    check(status == 409 and body.get("code") == "CATEGORY_NAME_EXISTS", "分类重名返回明确冲突")
    status, _ = request(MCP_URL, "/product-categories", "POST", {"categoryName": " ", "sortOrder": -1}, mcp)
    check(status == 400, "分类名称与排序非法值被拒绝")
    sql("UPDATE biz_product SET category='低值耗材' WHERE id=1 AND tenant_id=1;", "mcp_it")
    api(MCP_URL, f"/product-categories/{category['id']}", "PUT", {"categoryName": "低值耗材_改名", "sortOrder": 5}, mcp)
    check(sql("SELECT category FROM biz_product WHERE id=1 AND tenant_id=1;", "mcp_it") == "低值耗材_改名", "分类修改同步本机构商品引用")
    unused = api(MCP_URL, "/product-categories", "POST", {"categoryName": "可删除分类", "sortOrder": 30}, mcp)
    status, body = request(MCP_URL, "/product-categories", "DELETE", {"ids": [unused["id"], category["id"]]}, mcp)
    check(status == 409 and body.get("code") == "CATEGORY_IN_USE" and any(c["id"] == unused["id"] for c in api(MCP_URL, "/product-categories", token=mcp)), "分类批量删除引用校验失败时整批保留")
    api(MCP_URL, f"/product-categories/{category['id']}", "PUT", {"categoryName": "低值耗材", "sortOrder": 10}, mcp)
    deleted = api(MCP_URL, "/product-categories", "DELETE", {"ids": [unused["id"]]}, mcp)
    check(deleted["deleted"] == 1 and all(c["id"] != unused["id"] for c in api(MCP_URL, "/product-categories", token=mcp)), "未被使用分类可软删除")
    sql("INSERT INTO biz_product_category(id,tenant_id,category_name,sort_order) VALUES(900020,2,'其他机构分类',1);", "mcp_it")
    check(all(c["id"] != 900020 for c in api(MCP_URL, "/product-categories", token=mcp)), "分类查询隔离其他机构")
    for method, path, payload in [("PUT", "/product-categories/900020", {"categoryName": "越权改名", "sortOrder": 0}), ("DELETE", "/product-categories", {"ids": [900020]})]:
        status, body = request(MCP_URL, path, method, payload, mcp)
        check(status == 404 and body.get("code") == "CATEGORY_NOT_FOUND", "分类跨机构" + method + "被拒绝")
    sql("INSERT INTO sys_role(id,tenant_id,role_code,role_name) VALUES(900020,1,'viewer','隔离只读'); INSERT INTO sys_user(id,tenant_id,username,password_hash,real_name,status) SELECT 900020,1,'e2e_viewer',password_hash,'隔离只读',1 FROM sys_user WHERE tenant_id=1 AND username='e2e_admin'; INSERT INTO sys_user_role(user_id,role_id) VALUES(900020,900020);", "mcp_it")
    viewer = api(MCP_URL, "/auth/login", "POST", {"username": "e2e_viewer", "password": PASSWORD})["token"]
    status, body = request(MCP_URL, "/product-categories", "POST", {"categoryName": "只读越权", "sortOrder": 1}, viewer)
    check(status == 403 and body.get("code") == "PERMISSION_DENIED", "分类无维护权限账户被拒绝")



def check_concurrent_plan_conversion(token, due):
    number = "IT_DOUBLE_" + secrets.token_hex(4)
    sql(f"INSERT INTO biz_purchase_plan(id,tenant_id,plan_no,hospital_id,product_id,plan_qty,unit_price,expected_delivery_date,status) VALUES(900012,1,'{number}',1,1,10,2,'{due}',3);", "mcp_it")
    env = os.environ.copy()
    env["MYSQL_PWD"] = DB_PASSWORD
    locker = subprocess.Popen([str(MYSQL_BIN / "mysql.exe"), "--no-defaults", "--protocol=TCP", "--host=127.0.0.1", f"--port={MYSQL_PORT}", "--user=root", "--batch", "--raw", "--skip-column-names", "--unbuffered", "mcp_it"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, creationflags=FLAGS)
    PROCESSES.append(locker)
    locker.stdin.write(b"START TRANSACTION; SELECT next_id FROM sys_id_sequence WHERE table_name='biz_purchase_order' FOR UPDATE;\n")
    locker.stdin.flush()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        check(pool.submit(locker.stdout.readline).result(timeout=10).strip().isdigit(), "并发转单序列屏障已建立")
        first = pool.submit(request, MCP_URL, f"/purchase-plans/{number}/delivery-edit", "POST", None, token)
        wait("第一次转单到达锁屏障", lambda: int(sql("SELECT COUNT(*) FROM performance_schema.data_lock_waits;")) >= 1, 10)
        second = pool.submit(request, MCP_URL, f"/purchase-plans/{number}/delivery-edit", "POST", None, token)
        wait("两次转单同时处于事务中", lambda: int(sql("SELECT COUNT(*) FROM performance_schema.data_lock_waits;")) >= 2, 10)
        locker.stdin.write(b"COMMIT;\n")
        locker.stdin.flush()
        results = [first.result(timeout=30), second.result(timeout=30)]
        check(sorted(r[0] for r in results) == [200, 400], "同一计划并发转单仅一次成功")
    locker.stdin.close()
    locker.wait(timeout=10)
    count_and_amount=sql("SELECT COUNT(*),SUM(total_amount) FROM biz_purchase_order WHERE tenant_id=1 AND plan_id=900012 AND deleted=0;", "mcp_it").split("\t")
    check(count_and_amount[0] == "1" and Decimal(count_and_amount[1]) == Decimal("20"), "并发转单只落一张20元订单")
    check(sql("SELECT SUM(i.delivered_qty) FROM biz_purchase_order o JOIN biz_delivery_order d ON d.order_id=o.id AND d.tenant_id=o.tenant_id JOIN biz_delivery_order_item i ON i.delivery_id=d.id AND i.tenant_id=d.tenant_id WHERE o.tenant_id=1 AND o.plan_id=900012 AND o.deleted=0;", "mcp_it") == "10", "并发转换配送数量不超过计划10件")


def main():
    global INSTANCE
    RUN.mkdir(parents=True)
    for port in (MYSQL_PORT, MCP_PORT, SPD_PORT):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", port))
    check((MYSQL_BIN / "mysqld.exe").exists(), "本地MySQL测试工具可用")
    data = RUN / "mysql-data"
    data.mkdir()
    init = subprocess.run([str(MYSQL_BIN / "mysqld.exe"), "--no-defaults", f"--basedir={MYSQL_BIN.parent}",
                           f"--datadir={data}", "--initialize-insecure", f"--log-error={RUN / 'mysql-initialize.log'}"], capture_output=True, creationflags=FLAGS)
    check(init.returncode == 0, "隔离MySQL初始化")
    launch([str(MYSQL_BIN / "mysqld.exe"), "--no-defaults", f"--basedir={MYSQL_BIN.parent}", f"--datadir={data}",
            "--bind-address=127.0.0.1", f"--port={MYSQL_PORT}", "--mysqlx=OFF", "--skip-log-bin",
            "--secure-file-priv=NULL", f"--log-error={RUN / 'mysql-server.log'}"], "mysql-console.log")
    wait("隔离MySQL启动", lambda: sql("SELECT 1", password="") == "1", 60)
    sql(f"ALTER USER 'root'@'localhost' IDENTIFIED BY '{DB_PASSWORD}'; CREATE DATABASE mcp_it CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE DATABASE spd_it CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;", password="")

    env = os.environ.copy()
    env.update({"SERVER_PORT": str(MCP_PORT), "SPRING_PROFILES_ACTIVE": "test", "SPRING_DATASOURCE_URL": f"jdbc:mysql://127.0.0.1:{MYSQL_PORT}/mcp_it?serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false",
                "SPRING_DATASOURCE_USERNAME": "root", "SPRING_DATASOURCE_PASSWORD": DB_PASSWORD,
                "APP_PHASE3_ENABLED": "true", "APP_PHASE3_SUPPLY_ENABLED": "true", "APP_API_KEY": SECRET, "APP_AUTH_TOKEN_SECRET": SECRET, "APP_ADMIN_USERNAME": "e2e_admin", "APP_ADMIN_PASSWORD": PASSWORD,
                "SPD_PR_MAIN_TOKEN": SECRET, "APP_UPLOAD_ROOT_DIR": str(RUN / "mcp-uploads"), "APP_LICENSE_UPLOAD_DIR": str(RUN / "mcp-uploads/licenses")})
    mcp_jar = Path(os.environ.get("MCP_TEST_JAR", str(ROOT / "server/target/spd-mcp-api.jar")))
    mcp_args = ["java", "-jar", str(mcp_jar), "--server.address=127.0.0.1"]
    mcp_env = env.copy()
    mcp_process = launch(mcp_args, "mcp-backend.log", mcp_env)
    wait("MCP-UI真实迁移及启动", lambda: health(MCP_URL), 100)
    mcp = api(MCP_URL, "/auth/login", "POST", {"username": "e2e_admin", "password": PASSWORD})["token"]
    check_category_api(mcp)
    # Native MCP purchasing: reject -> edit draft -> resubmit -> approve, and a real conversion/edit race.
    plan_no = "IT_PLAN_" + secrets.token_hex(4)
    due = str(TODAY + dt.timedelta(days=7))
    sql(f"INSERT INTO biz_purchase_plan(id,tenant_id,plan_no,hospital_id,product_id,plan_qty,unit_price,expected_delivery_date,status) VALUES(900010,1,'{plan_no}',1,1,10,2,'{due}',1);", "mcp_it")
    api(MCP_URL, "/purchase-plans/900010/reject", "POST", token=mcp)
    check(sql("SELECT status FROM biz_purchase_plan WHERE id=900010;", "mcp_it") == "2", "原生计划驳回实际落库")
    correction = {"quantity": 12, "unitPrice": 2, "expectedDeliveryDate": due}
    api(MCP_URL, "/purchase-plans/900010", "PUT", correction, mcp)
    check(sql("SELECT status FROM biz_purchase_plan WHERE id=900010;", "mcp_it") == "0", "驳回计划修改后回到草稿")
    api(MCP_URL, "/purchase-plans/900010/submit", "POST", token=mcp)
    check(sql("SELECT status FROM biz_purchase_plan WHERE id=900010;", "mcp_it") == "1", "修改后可重新提交审批")
    api(MCP_URL, "/purchase-plans/900010/approve", "POST", token=mcp)
    check(sql("SELECT status FROM biz_purchase_plan WHERE id=900010;", "mcp_it") == "3", "重新提交后可再次审批通过")
    delivery = api(MCP_URL, f"/purchase-plans/{plan_no}/delivery-edit", "POST", token=mcp)
    native_orders = api(MCP_URL, "/purchase-orders", token=mcp)
    check(any(o["id"] == delivery["orderId"] for o in native_orders), "原生采购订单接口返回真实新订单")
    check(Decimal(sql(f"SELECT total_amount FROM biz_purchase_order WHERE id={delivery['orderId']} AND tenant_id=1;", "mcp_it")) == Decimal("24"), "计划12件乘2元实际转换为24元订单")
    check(sql(f"SELECT SUM(plan_qty),SUM(delivered_qty) FROM biz_delivery_order_item WHERE delivery_id={delivery['deliveryId']} AND tenant_id=1 AND deleted=0;", "mcp_it").split("\t") == ["12", "12"], "转单配送明细保留计划及实配数量12件")
    status, _ = request(MCP_URL, "/purchase-plans/900010", "PUT", correction, mcp)
    check(status == 400, "已转单计划不可继续编辑")
    race_no = "IT_RACE_" + secrets.token_hex(4)
    sql(f"INSERT INTO biz_purchase_plan(id,tenant_id,plan_no,hospital_id,product_id,plan_qty,unit_price,expected_delivery_date,status) VALUES(900011,1,'{race_no}',1,1,10,2,'{due}',3);", "mcp_it")
    locker_env = os.environ.copy()
    locker_env["MYSQL_PWD"] = DB_PASSWORD
    locker = subprocess.Popen([str(MYSQL_BIN / "mysql.exe"), "--no-defaults", "--protocol=TCP", "--host=127.0.0.1", f"--port={MYSQL_PORT}", "--user=root", "--batch", "--raw", "--skip-column-names", "--unbuffered", "mcp_it"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=locker_env, creationflags=FLAGS)
    PROCESSES.append(locker)
    locker.stdin.write(b"START TRANSACTION; SELECT id FROM biz_purchase_plan WHERE id=900011 FOR UPDATE;\n")
    locker.stdin.flush()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        check(pool.submit(locker.stdout.readline).result(timeout=10).strip() == b"900011", "并发测试已锁定专用计划行")
        conversion = pool.submit(request, MCP_URL, f"/purchase-plans/{race_no}/delivery-edit", "POST", None, mcp)
        wait("真实转单事务等待行锁", lambda: int(sql("SELECT COUNT(*) FROM performance_schema.data_lock_waits;")) >= 1, 10)
        editing = pool.submit(request, MCP_URL, "/purchase-plans/900011", "PUT", {"quantity": 999, "unitPrice": 99, "expectedDeliveryDate": due}, mcp)
        wait("编辑事务已读旧状态并等待行锁", lambda: int(sql("SELECT COUNT(*) FROM performance_schema.data_lock_waits;")) >= 2, 10)
        locker.stdin.write(b"COMMIT;\n")
        locker.stdin.flush()
        converted, edited = conversion.result(timeout=30), editing.result(timeout=30)
        check(converted[0] == 200 and edited[0] == 400 and edited[1].get("code") == "PLAN_STATUS_CHANGED", "转单先提交后，并发编辑被原子状态条件拒绝")
    locker.stdin.close()
    locker.wait(timeout=10)
    check(sql("SELECT CAST(plan_qty AS SIGNED),unit_price FROM biz_purchase_plan WHERE id=900011;", "mcp_it").split("\t") == ["10", "2.0000"], "并发编辑未改写已转单数量及单价")
    check_concurrent_plan_conversion(mcp, due)
    cfg = {"name": "隔离联调医院", "organization": "E2E_HOSPITAL", "endpoint": SPD_URL + "/mcp/receive", "tokenEnv": "SPD_PR_MAIN_TOKEN", "enabled": True}
    INSTANCE = api(MCP_URL, "/integration/instances", "POST", cfg, mcp)["id"]
    emit("MCP-UI创建真实对接实例")
    env = os.environ.copy()
    env.update({"SERVER_PORT": str(SPD_PORT), "SPRING_PROFILES_ACTIVE": "test", "SPD_DB_URL": f"jdbc:mysql://127.0.0.1:{MYSQL_PORT}/spd_it?serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false",
                "SPD_DB_USERNAME": "root", "SPD_DB_PASSWORD": DB_PASSWORD, "SPD_JWT_SECRET": SECRET,
                "SPD_MCP_ENABLED": "true", "SPD_MCP_UPLOAD_ENABLED": "true", "SPD_MCP_SUPPLY_ENABLED": "true", "SPD_MCP_ORGANIZATION": "E2E_HOSPITAL", "SPD_MCP_SHARED_TOKEN": SECRET,
                "SPD_MCP_OPERATOR_ID": "900001", "SPD_MCP_UI_URL": "http://127.0.0.1:1/api", "SPD_MCP_UI_INSTANCE_ID": INSTANCE, "SPD_MCP_UI_TENANT_ID": "1",
                "SPD_MCP_UI_USERNAME": "e2e_admin", "SPD_MCP_UI_PASSWORD": PASSWORD, "SPD_MCP_UI_API_KEY": SECRET,
                "SPD_MCP_CURRENCY": "CNY", "SPD_MCP_TAX_INCLUDED": "true", "SPD_MCP_SOURCE_ZONE": "Asia/Shanghai", "SPD_MCP_PHASE2_UPLOAD_ENABLED": "true", "SPD_UPLOAD_DIR": str(RUN / "spd-uploads")})
    spd_jar = os.environ.get("SPD_TEST_JAR")
    jars = [Path(spd_jar)] if spd_jar else list((SPD / "backend/target").glob("*.jar"))
    check(bool(jars), "SPD-PR联调jar可用")
    launch(["java", "-jar", str(jars[0]), f"--server.port={SPD_PORT}", "--server.address=127.0.0.1", "--spd.mcp.upload-delay-ms=2000", "--logging.level.com.hospital.spd.integration.McpUploadJob=WARN"], "spd-backend.log", env, SPD)
    wait("SPD-PR真实迁移及启动", lambda: health(SPD_URL), 150)
    encrypted = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    admin_id = int(sql("SELECT user_id FROM sys_user WHERE username='admin';", "spd_it"))
    sql(f"UPDATE sys_user SET password='{encrypted}',status=1,login_fail_count=0,lock_time=NULL WHERE user_id={admin_id}; INSERT INTO sys_user(user_id,username,password,real_name,status,dept_id) SELECT 900001,'e2e_receiver','{encrypted}','联调接收账户',1,dept_id FROM sys_user WHERE user_id={admin_id}; INSERT INTO sys_user_role(user_id,role_id) SELECT 900001,role_id FROM sys_user_role WHERE user_id={admin_id};", "spd_it")
    spd = api(SPD_URL, "/auth/login", "POST", {"username": "admin", "password": PASSWORD})["token"]
    connection = {"configType": "integration", "scopeType": "global", "scopeId": "default", "configKey": "integration.mcp-ui.connection", "configValue": json.dumps({"protocol": "http", "host": "127.0.0.1", "port": MCP_PORT, "phase2Enabled": True, "phase3Enabled": True}, separators=(",", ":")), "effectiveMode": "realtime", "expireTime": "", "riskLevel": "low", "status": 1}
    api(SPD_URL, "/system-config", "POST", connection, spd)
    emit("通过系统设置API保存IP端口，覆盖故意错误的旧环境地址")
    source_company = sql("SELECT manufacturer_name FROM manufacturer WHERE status=1 AND deleted=0 LIMIT 1;", "spd_it")
    supplier = sql("SELECT supplier_code,supplier_name FROM supplier WHERE status=1 AND deleted=0 LIMIT 1;", "spd_it").split("\t")
    wait("SPD-PR厂家供应商真实任务上传", lambda: any(r["payload"]["name"] == source_company for r in mcp_records(mcp, "manufacturer")) and any(r["sourceCode"] == supplier[0] for r in mcp_records(mcp, "supplier")))
    key = secrets.token_hex(4)
    code, name = "IT_" + key, "双端联调耗材_" + key
    product = api(MCP_URL, "/products", "POST", {"code": code, "name": name, "spec": "5ml", "model": "IT", "unitPrice": 2, "unit": "支", "registrationNo": "REG_" + key, "category": "低值耗材", "manufacturer": source_company, "distributor": supplier[1], "brand": "联调品牌", "status": "active"}, mcp)
    pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"
    boundary = "IT" + secrets.token_hex(8)
    multipart = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"certificate.pdf\"\r\nContent-Type: application/pdf\r\n\r\n".encode() + pdf + f"\r\n--{boundary}--\r\n".encode())
    upload = api(MCP_URL, "/licenses/upload", "POST", token=mcp, raw=multipart, content_type="multipart/form-data; boundary=" + boundary)
    license_body = {"licenseCode": "REG_" + key, "licenseName": "联调注册证", "licenseType": "注册证", "relatedProduct": name, "hospitalName": "联调医院", "issueDate": str(TODAY - dt.timedelta(days=30)), "expiryDate": str(TODAY + dt.timedelta(days=365)), "fileUrl": upload["fileUrl"], "remark": "仅隔离测试使用"}
    license_id = api(MCP_URL, "/licenses", "POST", license_body, mcp)["id"]
    dispatched = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": False}, mcp)
    check(dispatched[0]["state"] == "processed", "商品及证照跨端真实下发", dispatched[0]["message"])
    pending_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    check(sql(f"SELECT COUNT(*) FROM product WHERE product_code='{code}';", "spd_it") == "0", "下发仅进入待审批目录，未直接进入院内目录")
    attachment = sql(f"SELECT a.file_path FROM mcp_pending_license l JOIN sys_attachment a ON a.attachment_id=l.attachment_id WHERE l.source_product_id={product['id']};", "spd_it")
    saved = RUN / "spd-uploads/pending-products" / attachment
    check(saved.exists() and hashlib.sha256(saved.read_bytes()).digest() == hashlib.sha256(pdf).digest(), "证照附件实际字节跨端一致")
    renewed_expiry = str(TODAY + dt.timedelta(days=730))
    license_body["expiryDate"] = renewed_expiry
    api(MCP_URL, f"/licenses/{license_id}", "PUT", license_body, mcp)
    renewed = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    check(renewed[0]["state"] == "processed", "待审批阶段独立重发证照成功", renewed[0]["message"])
    check(sql(f"SELECT registration_expire_date FROM pending_product_application WHERE application_no='{pending_no}';", "spd_it") == renewed_expiry, "独立重发同步更新申请注册证有效期")
    extra_license = dict(license_body, licenseCode="PENDING_OLD_" + key, licenseName="审批中改号测试", licenseType="生产许可证")
    extra_id = api(MCP_URL, "/licenses", "POST", extra_license, mcp)["id"]
    extra_dispatch = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    check(extra_dispatch[0]["state"] == "processed", "审批前附加来源证照接收成功")
    extra_license["licenseCode"] = "PENDING_NEW_" + key
    api(MCP_URL, f"/licenses/{extra_id}", "PUT", extra_license, mcp)
    renamed_pending = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    check(renamed_pending[0]["state"] == "processed", "同一待审批证照修改编号后重发成功")
    check(sql(f"SELECT COUNT(*) FROM sys_attachment a JOIN pending_product_application p ON p.application_id=a.biz_id WHERE p.application_no='{pending_no}' AND a.biz_type='pending_product_application' AND a.deleted=0;", "spd_it") == "2", "审批中改号替换旧文件而不是累计第三份附件")
    approve_application(spd, pending_no)
    check(sql(f"SELECT COUNT(*) FROM sys_attachment a JOIN product p ON p.product_id=a.biz_id WHERE p.product_code='{code}' AND a.biz_type='product' AND a.deleted=0;", "spd_it") == "2", "审批后只提升两份当前证照，没有改号旧附件")
    check(sql(f"SELECT COUNT(*) FROM product WHERE product_code='{code}';", "spd_it") == "1", "真实审批后进入院内目录")
    check(sql(f"SELECT registration_expire_date FROM product WHERE product_code='{code}';", "spd_it") == renewed_expiry, "审批落库使用续期后的有效期")
    # A approved -> independent B rejected -> independent C approved: retain the actual approved A target.
    approved_a = sql(f"SELECT attachment_id FROM mcp_license_approved WHERE source_product_id={product['id']} AND source_license_id='{license_id}';", "spd_it")
    api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    rejected_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    api(SPD_URL, f"/pending-product-applications/{rejected_no}/action", "PUT", {"action": "reject", "opinion": "隔离回归：驳回续证B"}, spd)
    check(sql(f"SELECT attachment_id FROM mcp_license_approved WHERE source_product_id={product['id']} AND source_license_id='{license_id}';", "spd_it") == approved_a, "驳回续证不会覆盖已批准证照身份")
    api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    replacement_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    approve_application(spd, replacement_no)
    check(sql(f"SELECT COUNT(*) FROM sys_attachment WHERE biz_type='product' AND source_attachment_id={approved_a} AND deleted=0;", "spd_it") == "0", "驳回后重发审批实际退役原有效证照A")
    renamed_old = sql(f"SELECT attachment_id FROM mcp_license_approved WHERE source_product_id={product['id']} AND source_license_id='{license_id}';", "spd_it")
    license_body["licenseCode"] = "RENAMED_" + key
    api(MCP_URL, f"/licenses/{license_id}", "PUT", license_body, mcp)
    api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    rename_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    approve_application(spd, rename_no)
    check(sql(f"SELECT license_code FROM mcp_license_approved WHERE source_product_id={product['id']} AND source_license_id='{license_id}';", "spd_it") == license_body["licenseCode"], "改编号保持同一来源证照身份")
    check(sql(f"SELECT COUNT(*) FROM sys_attachment WHERE biz_type='product' AND source_attachment_id={renamed_old} AND deleted=0;", "spd_it") == "0", "改编号续证后旧附件退役")
    order = api(SPD_URL, "/purchase-orders", "POST", {"supplierName": supplier[1], "orderSource": "manual", "expectedArrivalDate": str(TODAY + dt.timedelta(days=7)), "items": [{"productCode": code, "quantity": 10, "unit": "支", "estimatedUnitPrice": 2}]}, spd)["orderNo"]
    for action in ("submit", "approve", "send"):
        api(SPD_URL, f"/purchase-orders/{order}/action", "PUT", {"action": action, "opinion": "隔离双端联调"}, spd)
    wait("采购订单由SPD-PR真实任务上传", lambda: find_record(mcp, "order", order))
    imported = next(p for p in api(MCP_URL, "/purchase-plans", token=mcp) if p["sourceNo"] == order)
    check(imported["quantity"] == 10 and imported["amount"] == 20
          and imported["planFields"]["productCode"] == code and imported["planFields"]["unit"] == "支"
          and imported["planFields"]["unitPrice"] == 2 and not imported["canEdit"] and not imported["canApprove"],
          "真实上传订单明细展示在采购计划且保持只读")
    convert_status, _ = request(MCP_URL, f"/purchase-plans/{imported['documentNo']}/delivery-edit", "POST", token=mcp)
    check(convert_status == 400, "导入采购计划拒绝重复转单")
    read_only_user = api(MCP_URL, "/auth/login", "POST", {"username": "e2e_viewer", "password": PASSWORD})["token"]
    check(all(not p["sourceNo"] for p in api(MCP_URL, "/purchase-plans", token=read_only_user)),
          "无对接查询权限的账号看不到SPD-PR导入计划")
    fixture = find_record(mcp, "order", order)
    version = dt.datetime.now(dt.timezone.utc)
    def projected_version(offset):
        return (version + dt.timedelta(seconds=offset)).isoformat().replace("+00:00", "Z")
    source_line = fixture["items"][0]
    new_line = dict(source_line, lineId="fixture-second", quantity=1.25, unitPrice=2.5, amount=3.125)
    projected_order = dict(fixture, orderNo="IT_PROJECT_" + key, sourceUpdatedAt=projected_version(1),
                           items=[source_line, new_line], totalAmount=23.125)
    endpoint = f"/integration/instances/{INSTANCE}/orders"
    check(api(MCP_URL, endpoint, "POST", projected_order, mcp, spd_token=SECRET)["state"] == "processed",
          "多明细采购订单进入采购计划")
    projected = [p for p in api(MCP_URL, "/purchase-plans", token=mcp) if p["sourceNo"] == projected_order["orderNo"]]
    fractional = next(p for p in projected if p["quantity"] == 1.25)
    check(len(projected) == 2 and fractional["amount"] == 3.125 and fractional["planFields"]["unitPrice"] == 2.5,
          "导入计划保留小数数量、单价和来源金额")
    check(api(MCP_URL, endpoint, "POST", projected_order, mcp, spd_token=SECRET)["state"] == "ignored",
          "同版本订单重复上传不会重复生成计划")
    cancelled = dict(projected_order, status="cancelled", sourceUpdatedAt=projected_version(2), items=[new_line], totalAmount=3.125)
    check(api(MCP_URL, endpoint, "POST", cancelled, mcp, spd_token=SECRET)["state"] == "processed",
          "订单更新与取消同步到采购计划")
    api(MCP_URL, endpoint, "POST", projected_order, mcp, spd_token=SECRET)
    projected = [p for p in api(MCP_URL, "/purchase-plans", token=mcp) if p["sourceNo"] == projected_order["orderNo"]]
    check(len(projected) == 1 and projected[0]["id"] == fractional["id"]
          and projected[0]["planFields"]["sourceStatus"] == "cancelled",
          "取消保留原记录、删除旧明细且旧版本不能复活")
    audit_endpoint = f"/integration/instances/{INSTANCE}/order-receive-logs"
    invalid_order = dict(fixture, orderNo="IT_LOG_" + key, items=[dict(source_line, productCode="UNMAPPED_LOG_ITEM")])
    failed_log = api(MCP_URL, endpoint, "POST", invalid_order, mcp, spd_token=SECRET)
    check(failed_log["state"] == "failed", "订单业务接收失败有原始日志")
    retry = api(MCP_URL, f"/integration/logs/{failed_log['id']}/retry", "POST", token=mcp)
    check(retry["state"] == "failed", "失败订单可重试并保留失败历史")
    logs = api(MCP_URL, audit_endpoint + f"?orderNo={invalid_order['orderNo']}&page=1&size=1", token=mcp)
    check(logs["total"] == 2 and len(logs["records"]) == 1, "设置页接口日志支持订单号查询与分页")
    detail = api(MCP_URL, audit_endpoint + "/" + failed_log["id"], token=mcp)
    check(detail["log"]["state"] == "retried" and "商品未匹配" in detail["log"]["reason"]
          and detail["parameters"]["items"][0]["productCode"] == "UNMAPPED_LOG_ITEM", "重试后保留原失败原因及订单参数")
    malformed = dict(fixture, orderNo="IT_FIELDS_" + key, orderDate="not-a-date",
                     authorization="must-not-be-stored", items=[dict(source_line, password="must-not-be-stored")])
    status, response = request(MCP_URL, endpoint, "POST", malformed, mcp, spd_token=SECRET)
    check(status == 400 and response["code"] == "ORDER_FIELDS_INVALID", "字段解析错误进入接口失败流程")
    field_logs = api(MCP_URL, audit_endpoint + f"?orderNo={malformed['orderNo']}", token=mcp)
    field_detail = api(MCP_URL, audit_endpoint + "/" + field_logs["records"][0]["id"], token=mcp)
    check(field_detail["log"]["httpStatus"] == 400 and field_detail["parameters"]["orderDate"] == "not-a-date"
          and "must-not-be-stored" not in json.dumps(field_detail), "失败详情保留业务字段并剔除未知敏感字段")
    status, response = request(MCP_URL, endpoint, "POST", token=mcp, spd_token=SECRET, raw=b'{"items":[')
    check(status == 400 and response["code"] == "ORDER_JSON_INVALID", "非法JSON明确拒绝")
    status, response = request(MCP_URL, endpoint, "POST", fixture, mcp, spd_token="wrong-instance-key")
    check(status == 401 and response["code"] == "SPD_TOKEN_INVALID", "实例鉴权错误明确拒绝")
    auth_logs = api(MCP_URL, audit_endpoint + f"?orderNo={fixture['orderNo']}", token=mcp)["records"]
    auth_log = next(entry for entry in auth_logs if entry.get("failureCode") == "SPD_TOKEN_INVALID")
    auth_detail = api(MCP_URL, audit_endpoint + "/" + auth_log["id"], token=mcp)
    check(auth_detail["parameters"]["items"][0]["productCode"] == code
          and "wrong-instance-key" not in json.dumps(auth_detail), "鉴权失败保留订单业务参数且不泄露令牌")
    status, response = request(MCP_URL, endpoint, "POST", token=mcp, spd_token="wrong-instance-key", raw=b'{"items":[')
    check(status == 401 and response["code"] == "SPD_TOKEN_INVALID", "无法提取请求参数时仍保留原鉴权响应")
    request_logs = api(MCP_URL, audit_endpoint, token=mcp)["records"]
    check({"ORDER_JSON_INVALID", "SPD_TOKEN_INVALID"}.issubset({entry.get("failureCode") for entry in request_logs}),
          "非法JSON及实例鉴权失败均可在接口日志查询")
    status, _ = request(MCP_URL, audit_endpoint + "/" + failed_log["id"], token=read_only_user)
    check(status == 403, "无对接权限账号不能查看订单请求参数")
    exact = "12345678901234.1234"
    exact_order = dict(fixture, orderNo="IT_EXACT_" + key, status="cancelled", totalAmount="EXACT_DECIMAL",
                       items=[dict(source_line, quantity=1, unitPrice="EXACT_DECIMAL", amount="EXACT_DECIMAL")])
    def exact_body(payload):
        return json.dumps(payload).replace('"EXACT_DECIMAL"', exact).encode()
    exact_result = api(MCP_URL, endpoint, "POST", token=mcp, spd_token=SECRET, raw=exact_body(exact_order))
    exact_plan = sql(f"SELECT unit_price,spd_amount FROM biz_purchase_plan WHERE spd_order_no='{exact_order['orderNo']}';", "mcp_it")
    exact_snapshot = sql(f"SELECT payload_exact FROM spd_record WHERE kind='order' AND source_code='{exact_order['orderNo']}';", "mcp_it")
    check(exact_result["state"] == "processed" and exact_plan.split("\t") == [exact, exact]
          and json.loads(exact_snapshot, parse_float=Decimal)["totalAmount"] == Decimal(exact),
          "高精度订单金额和单价完整写入计划及原始快照")
    exact_invalid = dict(exact_order, orderNo="IT_EXACT_LOG_" + key, orderDate="not-a-date")
    status, _ = request(MCP_URL, endpoint, "POST", token=mcp, spd_token=SECRET, raw=exact_body(exact_invalid))
    exact_logs = api(MCP_URL, audit_endpoint + f"?orderNo={exact_invalid['orderNo']}", token=mcp)["records"]
    exact_detail = api(MCP_URL, audit_endpoint + "/" + exact_logs[0]["id"], token=mcp)
    check(status == 400 and json.loads(exact_detail["parametersJson"], parse_float=Decimal)["items"][0]["amount"] == Decimal(exact),
          "失败详情文本保留高精度原金额")
    conflict_order = dict(fixture, orderNo="IT_KEY_CONFLICT_" + key, totalAmount=40,
                          items=[dict(source_line, lineId="fixture-line"), dict(source_line, lineId="fixture-line ")])
    status, response = request(MCP_URL, endpoint, "POST", conflict_order, mcp, spd_token=SECRET)
    conflict_logs = api(MCP_URL, audit_endpoint + f"?orderNo={conflict_order['orderNo']}", token=mcp)["records"]
    check(status == 400 and response["code"] == "DUPLICATE_KEY" and conflict_logs[0]["httpStatus"] == status
          and conflict_logs[0]["failureCode"] == response["code"] and not find_record(mcp, "order", conflict_order["orderNo"]),
          "唯一约束失败事务回滚，接口响应与日志错误码一致")
    warehouse = sql("SELECT warehouse_code,warehouse_name FROM warehouse WHERE status=1 AND deleted=0 AND receiving_enabled=1 LIMIT 1;", "spd_it").split("\t")
    product_id = sql(f"SELECT product_id FROM product WHERE product_code='{code}';", "spd_it")
    warehouse_id = sql(f"SELECT warehouse_id FROM warehouse WHERE warehouse_code='{warehouse[0]}';", "spd_it")
    sql(f"INSERT IGNORE INTO warehouse_product_binding(warehouse_id,product_id,status,deleted) VALUES({warehouse_id},{product_id},1,0);", "spd_it")
    line_id = int(sql(f"SELECT i.item_id FROM purchase_order_item i JOIN purchase_order p ON p.purchase_order_id=i.purchase_order_id WHERE p.order_no='{order}';", "spd_it"))
    supply_base = f"/integration/instances/{INSTANCE}/phase3"
    supply_order = f"{supply_base}/purchase-orders/{order}"
    draft_path = supply_order + "/supply-draft"
    status, _ = request(MCP_URL, draft_path, "POST", token=mcp)
    check(status == 404, "未绑定供应商不能为来源订单生成草稿")
    api(MCP_URL, supply_base + "/supplier-access", "POST", {"username": "e2e_admin", "supplierCode": supplier[0]}, mcp)
    draft = api(MCP_URL, draft_path, "POST", token=mcp)
    reopened = api(MCP_URL, draft_path, "POST", token=mcp)
    check(draft["draftId"] == reopened["draftId"] and draft["orderNo"] == order, "重复确认打开同一供货草稿")
    options = api(MCP_URL, supply_order + "/supply-options", token=mcp)
    check(any(w["code"] == warehouse[0] for w in options["warehouses"]), "供货草稿读取真实院内收货库房")
    draft_line = {"orderLineId": str(line_id), "productCode": code, "unit": "支", "quantity": "1", "productionDate": str(TODAY - dt.timedelta(days=2)), "expireDate": str(TODAY + dt.timedelta(days=365)), "udiCode": ""}
    draft_body = dict(draft["body"], warehouseCode=warehouse[0],
                      items=[dict(draft_line, supplyLineId=f"batch-{i}", productionBatchNo=f"SUPPLY-{key}-{i}") for i in (1, 2)])
    saved = api(MCP_URL, draft_path + "/" + draft["draftId"], "PUT", draft_body, mcp)
    check(saved["body"] == draft_body and any(d["draftId"] == draft["draftId"] for d in api(MCP_URL, "/integration/phase3/supply-drafts", token=mcp)),
          "供货草稿保存并可在采购订单页恢复")
    submitted = api(MCP_URL, supply_order + "/supplies", "POST", saved["body"], mcp, idempotency_key=draft["draftId"])
    check(submitted["messageId"] == draft["draftId"] and not api(MCP_URL, "/integration/phase3/supply-drafts", token=mcp),
          "提交后移除草稿并保留同一幂等身份")
    wait("多批次供货单由SPD-PR真实接收", lambda: any(r["messageId"] == draft["draftId"] and r["state"] == "processed"
         for r in api(MCP_URL, "/integration/phase3/supply-orders", token=mcp)["rows"]))
    receipt = api(SPD_URL, "/receiving-orders", "POST", {"sourceType": "purchase_order", "purchaseOrderNo": order, "supplierName": supplier[1], "warehouseCode": warehouse[0], "warehouseName": warehouse[1], "receivingType": "normal", "items": [{"purchaseOrderItemId": line_id, "productCode": code, "productionBatchNo": "LOT_" + key, "productionDate": str(TODAY - dt.timedelta(days=20)), "expireDate": str(TODAY + dt.timedelta(days=365)), "quantity": 8, "qualifiedQuantity": 6, "unqualifiedQuantity": 2}]}, spd)["receivingNo"]
    api(SPD_URL, f"/receiving-orders/{receipt}/action", "PUT", {"action": "approve", "opinion": "隔离双端联调"}, spd)
    received = wait("收货验收由SPD-PR真实任务上传", lambda: find_record(mcp, "receiving", receipt))
    inbounds = wait("真实入库事件上传", lambda: next((r["payload"] for r in mcp_records(mcp, "inbound") if r["payload"]["receivingNo"] == receipt), None))
    report = wait("批次余额真实任务上传", lambda: (r if any(i["stock"]["productCode"] == code for i in r["inventory"]) else None) if (r := api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/report", token=mcp)) else None)
    execution = next(r for r in report["execution"] if r["orderNo"] == order)
    check(execution["ordered"] == 10 and execution["qualified"] == 6 and execution["rejected"] == 2 and execution["inbound"] == 6 and execution["remaining"] == 4, "分批验收和入库数量报表核对")
    check(sum(r["stock"]["looseQuantity"] + r["stock"]["packagedQuantity"] for r in report["inventory"] if r["stock"]["productCode"] == code) == 6, "库存余额未重复叠加入库数量")
    source = "/integration/instances/" + INSTANCE + "/phase2/receiving"
    duplicate = api(MCP_URL, source, "POST", received, mcp, spd_token=SECRET)
    check(duplicate["state"] == "ignored", "重复上传不重复累计")
    stale = dict(received, sourceUpdatedAt="2020-01-01T00:00:00Z")
    check(api(MCP_URL, source, "POST", stale, mcp, spd_token=SECRET)["state"] == "ignored", "旧版本不覆盖新版本")
    future = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=10)).isoformat().replace("+00:00", "Z")
    bad = dict(received, documentNo="BAD_" + key, sourceUpdatedAt=future, items=[dict(received["items"][0], orderLineId="missing")])
    check(api(MCP_URL, source, "POST", bad, mcp, spd_token=SECRET)["state"] == "failed", "缺失关联保存失败记录而非部分单据")
    ret = {"documentNo": "RT_" + key, "inboundNo": inbounds["documentNo"], "warehouseCode": warehouse[0], "documentDate": str(TODAY), "status": "completed", "currency": "CNY", "taxIncluded": True, "sourceUpdatedAt": future,
           "items": [{"lineId": "1", "inboundLineId": inbounds["items"][0]["lineId"], "productCode": code, "unit": "支", "systemBatchNo": inbounds["items"][0]["systemBatchNo"], "quantity": 2, "amount": 4, "reason": "隔离接口测试"}]}
    check(api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/return", "POST", ret, mcp, spd_token=SECRET)["state"] == "processed", "退货接口：部分退货接收（接口夹具，无来源业务）")
    r = api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/report?product={code}", token=mcp)
    check(r["amounts"][0]["netAmount"] == 8 and r["execution"][0]["returned"] == 2, "退货金额及净入库报表核对")
    over = dict(ret, documentNo="OVER_" + key, items=[dict(ret["items"][0], quantity=5, amount=10)])
    check(api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/return", "POST", over, mcp, spd_token=SECRET)["state"] == "failed", "超量退货整单拒绝")
    ret["status"] = "cancelled"
    ret["sourceUpdatedAt"] = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=20)).isoformat().replace("+00:00", "Z")
    check(api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/return", "POST", ret, mcp, spd_token=SECRET)["state"] == "processed", "退货取消更新接收（接口夹具）")
    r = api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/report?product={code}", token=mcp)
    check(r["amounts"][0]["netAmount"] == 12 and r["execution"][0]["returned"] == 0, "取消退货后报表恢复原入库金额")
    late_no = "LATE_RC_" + key
    late_in = dict(inbounds, documentNo="LATE_IN_" + key, receivingNo=late_no, amountOrigin="provided", sourceUpdatedAt=future,
                   items=[dict(inbounds["items"][0], lineId="LATE_IN_LINE", receivingLineId="LATE_LINE", systemBatchNo="LATE_B_" + key, quantity=1, amount=2)])
    failed = api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/inbound", "POST", late_in, mcp, spd_token=SECRET)
    check(failed["state"] == "failed", "缺失收货关联的入库进入待处理记录（接口夹具）")
    late_receipt = dict(received, documentNo=late_no, sourceUpdatedAt=future, items=[dict(received["items"][0], lineId="LATE_LINE", quantity=1, qualifiedQuantity=1, rejectedQuantity=0)])
    api(MCP_URL, source, "POST", late_receipt, mcp, spd_token=SECRET)
    retried = api(MCP_URL, "/integration/logs/" + failed["id"] + "/retry", "POST", token=mcp)
    check(retried["state"] == "processed", "补齐关联后通过同步记录真实重试成功")
    status, _ = request(MCP_URL, source, "POST", received, mcp, spd_token="wrong-instance-key")
    check(status == 401, "错误实例密钥被拒绝")
    status, _ = request(MCP_URL, source, "POST", received, mcp, spd_token=SECRET, tenant=2)
    check(status == 401, "跨租户请求被拒绝")
    settings = api(SPD_URL, "/system-config?configType=integration&keyword=integration.mcp-ui.connection", token=spd)
    connection_id = next(c["configId"] for c in settings if c["configKey"] == "integration.mcp-ui.connection")
    connection["configValue"] = json.dumps({"protocol": "http", "host": "127.0.0.1", "port": MCP_PORT, "phase2Enabled": False}, separators=(",", ":"))
    api(SPD_URL, f"/system-config/{connection_id}", "PUT", connection, spd)
    previous_stock = find_record(mcp, "inventory", "current")
    empty_stock = dict(previous_stock, items=[], sourceUpdatedAt=(dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=30)).isoformat().replace("+00:00", "Z"))
    check(api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/inventory", "POST", empty_stock, mcp, spd_token=SECRET)["state"] == "processed", "空库存快照接收（接口夹具）")
    check(not api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/report", token=mcp)["inventory"], "空快照确实清除旧批次余额")
    check(api(MCP_URL, f"/integration/instances/{INSTANCE}/phase2/inventory", "POST", previous_stock, mcp, spd_token=SECRET)["state"] == "ignored", "旧库存快照不能复活已清除余额")
    # Directory regression cases run after normal procurement, so revoked qualifications cannot affect the fixture purchase.
    # Move the same certificate to another product and back. Both relationships require separate approvals.
    second_code, second_name = "IT_SECOND_" + key, "联调第二商品_" + key
    second_product = api(MCP_URL, "/products", "POST", {"code": second_code, "name": second_name, "spec": "5ml", "model": "IT", "unitPrice": 2, "unit": "支", "category": "低值耗材", "manufacturer": source_company, "distributor": supplier[1], "brand": "联调品牌", "status": "active"}, mcp)
    old_owner_attachment = sql(f"SELECT attachment_id FROM mcp_license_approved WHERE source_product_id={product['id']} AND source_license_id='{license_id}';", "spd_it")
    license_body["relatedProduct"] = second_name
    api(MCP_URL, f"/licenses/{license_id}", "PUT", license_body, mcp)
    moved = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [second_product["id"]], "licensesOnly": False}, mcp)
    check(len(moved) == 2 and all(r["state"] == "processed" for r in moved), "关联变更自动为旧商品补发解除请求")
    owner_cleanup = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    second_admission = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{second_code}';", "spd_it")
    approve_application(spd, owner_cleanup)
    approve_application(spd, second_admission)
    check(sql(f"SELECT COUNT(*) FROM sys_attachment WHERE biz_type='product' AND source_attachment_id={old_owner_attachment} AND deleted=0;", "spd_it") == "0", "旧商品关联审批后原附件解除")
    check(sql(f"SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.status')) FROM mcp_license_approved WHERE source_product_id={product['id']} AND source_license_id='{license_id}';", "spd_it") == "unlinked", "旧商品证照关系明确解除")
    license_body["relatedProduct"] = name
    api(MCP_URL, f"/licenses/{license_id}", "PUT", license_body, mcp)
    restored = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    check(len(restored) == 2 and all(r["state"] == "processed" for r in restored), "稳定证照身份支持再次迁移关联")
    for owner_code in (code, second_code):
        approve_application(spd, sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{owner_code}';", "spd_it"))
    # Non-registration certificates participate in actual purchasing qualification checks too.
    invalid_body = dict(license_body, licenseCode="PRODUCTION_" + key, licenseName="联调生产许可证", licenseType="生产许可证", expiryDate=str(TODAY - dt.timedelta(days=1)))
    invalid_id = api(MCP_URL, "/licenses", "POST", invalid_body, mcp)["id"]
    api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    invalid_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    approve_application(spd, invalid_no)
    purchase_body = {"supplierName": supplier[1], "orderSource": "manual", "expectedArrivalDate": str(TODAY + dt.timedelta(days=7)), "items": [{"productCode": code, "quantity": 1, "unit": "支", "estimatedUnitPrice": 2}]}
    invalid_draft = api(SPD_URL, "/purchase-orders", "POST", purchase_body, spd)["orderNo"]
    blocked_status, blocked_response = request(SPD_URL, f"/purchase-orders/{invalid_draft}/action", "PUT", {"action": "submit", "opinion": "证照阻断回归"}, spd)
    check((blocked_status != 200 or blocked_response.get("code") != 0) and invalid_body["licenseCode"] in blocked_response.get("message", ""), "已批准的非注册证过期状态阻断采购提交")
    invalid_body["expiryDate"] = renewed_expiry
    api(MCP_URL, f"/licenses/{invalid_id}", "PUT", invalid_body, mcp)
    api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    approve_application(spd, sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it"))
    api(SPD_URL, f"/purchase-orders/{invalid_draft}/action", "PUT", {"action": "submit", "opinion": "续期恢复回归"}, spd)
    emit("来源证照续期审批后采购提交恢复")
    old_attachment = sql(f"SELECT attachment_id FROM mcp_license_approved WHERE source_product_id={product['id']} AND source_license_id='{license_id}';", "spd_it")
    api(MCP_URL, "/licenses", "DELETE", {"ids": [license_id]}, mcp)
    revoked = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    check(revoked[0]["state"] == "processed", "已审批证照撤销进入新资质申请", revoked[0]["message"])
    revoke_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    check(sql(f"SELECT COUNT(*) FROM sys_attachment WHERE biz_type='product' AND source_attachment_id={old_attachment} AND deleted=0;", "spd_it") == "1", "审批前不直接撤销院内证照")
    approve_application(spd, revoke_no)
    check(sql(f"SELECT COUNT(*) FROM sys_attachment WHERE biz_type='product' AND source_attachment_id={old_attachment} AND deleted=0;", "spd_it") == "0", "审批后旧院内证照实际撤销")
    revoked_draft = api(SPD_URL, "/purchase-orders", "POST", purchase_body, spd)["orderNo"]
    blocked_status, blocked_response = request(SPD_URL, f"/purchase-orders/{revoked_draft}/action", "PUT", {"action": "submit", "opinion": "撤销阻断回归"}, spd)
    check((blocked_status != 200 or blocked_response.get("code") != 0) and license_body["licenseCode"] in blocked_response.get("message", ""), "已批准撤销的来源证照实际阻断采购提交")
    inactive_product = dict(product, status="inactive")
    api(MCP_URL, f"/products/{product['id']}", "PUT", inactive_product, mcp)
    stopped = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": False}, mcp)
    check(stopped[0]["state"] == "processed", "商品停用进入待审批申请", stopped[0]["message"])
    stop_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    active_product = dict(product, name=name + "_启用", status="active")
    api(MCP_URL, f"/products/{product['id']}", "PUT", active_product, mcp)
    conflict = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": False}, mcp)
    check(conflict[0]["state"] == "failed" and "冲突" in conflict[0]["message"], "恢复启用与待审批停用冲突时明确失败，避免反向执行")
    check(sql(f"SELECT application_type FROM pending_product_application WHERE application_no='{stop_no}';", "spd_it") == "停用申请", "冲突请求不改写原审批申请")
    approve_application(spd, stop_no)
    check(sql(f"SELECT status FROM product WHERE product_code='{code}';", "spd_it") == "0", "原停用申请按人工审批决定停用")
    certificate_only = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    check(certificate_only[0]["state"] == "processed", "已停用商品可独立提交资质更新", certificate_only[0]["message"])
    qualification_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    approve_application(spd, qualification_no)
    check(sql(f"SELECT status FROM product WHERE product_code='{code}';", "spd_it") == "0", "仅资质审批不会意外启用已停用商品")
    reactivated = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": False}, mcp)
    check(reactivated[0]["state"] == "processed", "停用商品收到active后创建启用审批")
    enable_no = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{code}';", "spd_it")
    check(sql(f"SELECT status FROM product WHERE product_code='{code}';", "spd_it") == "0", "启用下发未绕过院内审批")
    check(sql(f"SELECT JSON_UNQUOTE(JSON_EXTRACT(product_snapshot,'$.targetStatus')) FROM pending_product_application WHERE application_no='{enable_no}';", "spd_it") == "1", "启用意图进入服务端审批快照")
    renewal_during_enable = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [product["id"]], "licensesOnly": True}, mcp)
    check(renewal_during_enable[0]["state"] == "processed", "启用待审批期间仍可重发证照")
    check(sql(f"SELECT JSON_UNQUOTE(JSON_EXTRACT(product_snapshot,'$.targetStatus')) FROM pending_product_application WHERE application_no='{enable_no}';", "spd_it") == "1", "独立证照更新不抹掉尚待审批的启用意图")
    approve_application(spd, enable_no)
    check(sql(f"SELECT status FROM product WHERE product_code='{code}';", "spd_it") == "1", "审批通过后active真正恢复启用")
    obsolete_ids=[]
    for i in range(11):
        historical=dict(license_body,licenseCode=f"HIST_{key}_{i}",licenseName="撤销历史证照",licenseType="其他证照",productId=product["id"],relatedProduct=active_product["name"])
        obsolete_ids.append(api(MCP_URL,"/licenses","POST",historical,mcp)["id"])
    api(MCP_URL,"/licenses","DELETE",{"ids":obsolete_ids},mcp)
    with_history=api(MCP_URL,f"/integration/instances/{INSTANCE}/dispatch","POST",{"productIds":[product["id"]],"licensesOnly":True},mcp)
    check(with_history[0]["state"] == "processed", "超过十份软删除历史证照不阻断当前证照下发")
    historical_identity_list=",".join(str(int(identity)) for identity in obsolete_ids)
    history_count=sql(f"SELECT COUNT(*) FROM mcp_license_intent intent JOIN mcp_inbound_product p ON p.source_product_id=intent.source_product_id AND p.application_no=intent.application_no WHERE p.product_code='{code}' AND intent.source_license_id IN ({historical_identity_list}) AND JSON_UNQUOTE(JSON_EXTRACT(intent.metadata,'$.status'))='revoked';", "spd_it")
    check(history_count == "11", "撤销元数据完整接收，没有为绕过额度丢弃撤销", "received=" + history_count)
    nofile_code = "IT_NOFILE_" + secrets.token_hex(4)
    nofile_product = api(MCP_URL, "/products", "POST", {"code": nofile_code, "name": "无附件回归商品", "spec": "1ml", "model": "NOFILE", "unitPrice": 1, "unit": "支", "category": "低值耗材", "manufacturer": source_company, "distributor": supplier[1], "status": "active"}, mcp)
    nofile_dispatch = api(MCP_URL, f"/integration/instances/{INSTANCE}/dispatch", "POST", {"productIds": [nofile_product["id"]], "licensesOnly": False}, mcp)
    check(nofile_dispatch[0]["state"] == "processed", "无附件商品下发进入真实待审批目录")
    nofile_application = sql(f"SELECT application_no FROM mcp_inbound_product WHERE product_code='{nofile_code}';", "spd_it")
    approve_application(spd, nofile_application)
    nofile_detail = api(SPD_URL, f"/master-data/hospital-products/{nofile_code}", token=spd)
    check(nofile_detail["attachments"] == [], "无真实附件商品详情不伪造PDF")
    expected_spd = max(int(p.name.split("__",1)[0][1:]) for p in (SPD / "backend/src/main/resources/db/migration").glob("V*__*.sql"))
    check(int(sql("SELECT MAX(CAST(version AS UNSIGNED)) FROM flyway_schema_history WHERE success=1;", "spd_it")) == expected_spd, "SPD-PR迁移执行到当前源码版本")
    expected_mcp = max(int(p.name.split("__",1)[0][1:]) for p in (ROOT / "server/src/main/resources/db/migration").glob("V*__*.sql"))
    check(int(sql("SELECT MAX(CAST(version AS UNSIGNED)) FROM flyway_schema_history WHERE success=1;", "mcp_it")) == expected_mcp, "MCP-UI迁移执行到当前版本")
    if os.environ.get("SPD_TEST_SKIP_PHASE3") != "1":
        from phase3_acceptance import check_phase3
        check_phase3(sys.modules[__name__], mcp, spd, supplier, source_company)
    mcp_process.terminate()
    mcp_process.wait(timeout=15)
    sql(f"DELETE FROM biz_purchase_plan WHERE spd_instance_id='{INSTANCE}' AND spd_order_no='{projected_order['orderNo']}';", "mcp_it")
    launch(mcp_args, "mcp-backend-restarted.log", mcp_env)
    wait("MCP-UI重启后回填历史订单计划", lambda: sql(
        f"SELECT COUNT(*) FROM biz_purchase_plan WHERE spd_instance_id='{INSTANCE}' AND spd_order_no='{projected_order['orderNo']}' AND deleted=0 AND spd_order_status='cancelled';", "mcp_it") == "1")


if __name__ == "__main__":
    exit_code = 0
    try:
        main()
    except Exception as error:
        exit_code = 1
        emit("双端联调完成", False, str(error).replace(PASSWORD, "[redacted]").replace(DB_PASSWORD, "[redacted]").replace(SECRET, "[redacted]")[:500])
    finally:
        try:
            env = os.environ.copy()
            env["MYSQL_PWD"] = DB_PASSWORD
            subprocess.run([str(MYSQL_BIN / "mysqladmin.exe"), "--no-defaults", "--protocol=TCP", "--host=127.0.0.1", f"--port={MYSQL_PORT}", "--user=root", "shutdown"], env=env, capture_output=True, timeout=10, creationflags=FLAGS)
        except Exception:
            pass
        for process in reversed(PROCESSES):
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
        for handle in HANDLES:
            handle.close()
        RUN.mkdir(parents=True, exist_ok=True)
        (RUN / "report.json").write_text(json.dumps({"passed": exit_code == 0, "checks": RESULTS, "isolatedPorts": {"mysql": MYSQL_PORT, "mcp": MCP_PORT, "spd": SPD_PORT}}, ensure_ascii=False, indent=2), encoding="utf-8")
        print("Report: " + str(RUN / "report.json"), flush=True)
    sys.exit(exit_code)
