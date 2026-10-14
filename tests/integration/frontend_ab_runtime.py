"""Owned isolated runtime for manual Playwright CLI A/B frontend acceptance."""
import importlib.util
import json
import os
from pathlib import Path
import time

spec = importlib.util.spec_from_file_location("dual", Path(__file__).with_name("dual_system.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
d.PASSWORD = "AbUiTest_20261009!"
os.environ["CORS_ORIGIN"] = "http://127.0.0.1:5175"
try:
    source = Path(__file__).with_name("dual_system.py").read_text(encoding="utf-8")
    setup = source[source.index("def main():"):source.index("    key = secrets.token_hex(4)")]
    begin = setup.index("    # Native MCP purchasing:")
    end = setup.index("    cfg =", begin)
    setup = setup[:begin] + setup[end:]
    setup = setup.replace('"--server.address=127.0.0.1", "--spd.mcp.upload-delay-ms=2000"', '"--server.address=127.0.0.1", "--spd.cors.allowed-origins=http://127.0.0.1:1825", "--spd.mcp.upload-delay-ms=2000"')
    exec(setup, d.__dict__)
    d.main()
    env = os.environ.copy()
    env.update({"VITE_DEV_API_PROXY_TARGET": "http://127.0.0.1:18080", "VITE_API_KEY": d.SECRET})
    d.launch(["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5175"], "mcp-frontend.log", env)
    config = d.RUN / "spd-vite.config.mjs"
    config.write_text("import vue from 'file:///D:/SPD-PR/node_modules/@vitejs/plugin-vue/dist/index.mjs';\nexport default {root:'D:/SPD-PR/frontend',plugins:[vue()],server:{host:'127.0.0.1',port:1825,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:11818',changeOrigin:true}}}};", encoding="utf-8")
    d.launch(["node", "D:/SPD-PR/node_modules/vite/bin/vite.js", "--config", str(config)], "spd-frontend.log", cwd=d.SPD)
    (d.ROOT / "test-results/frontend-ab-runtime.json").write_text(json.dumps({"run": str(d.RUN), "instance": d.INSTANCE, "manufacturer": d.source_company if hasattr(d, 'source_company') else d.sql("SELECT manufacturer_name FROM manufacturer WHERE status=1 AND deleted=0 LIMIT 1", "spd_it"), "supplier": d.sql("SELECT supplier_name FROM supplier WHERE status=1 AND deleted=0 LIMIT 1", "spd_it")}, ensure_ascii=False), encoding="utf-8")
    print("FRONTEND_RUNTIME_READY " + str(d.RUN), flush=True)
    while not (d.RUN / "stop").exists():
        time.sleep(1)
finally:
    try:
        env = os.environ.copy()
        env["MYSQL_PWD"] = d.DB_PASSWORD
        d.subprocess.run([str(d.MYSQL_BIN / "mysqladmin.exe"), "--no-defaults", "--protocol=TCP", "--host=127.0.0.1", f"--port={d.MYSQL_PORT}", "--user=root", "shutdown"], env=env, capture_output=True, timeout=10, creationflags=d.FLAGS)
    except Exception:
        pass
    for process in reversed(d.PROCESSES):
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except Exception:
                process.kill()
    for handle in d.HANDLES:
        handle.close()
    print("FRONTEND_RUNTIME_CLEANED", flush=True)
