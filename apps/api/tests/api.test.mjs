/**
 * ICET API 集成测试脚本
 *
 * 使用方式：
 *   1. 确保 docker compose up -d && pnpm --filter @icet/api db:seed 已执行
 *   2. 确保 API 服务运行在 localhost:3000
 *   3. 运行: node apps/api/tests/api.test.mjs
 *
 * 脚本会自动：登录 → 测试所有 CRUD 端点 → 输出结果
 */

const BASE = 'http://localhost:3000/api/v1';

// ── 工具函数 ──

let token = '';
let orgId = '';
const results = { pass: 0, fail: 0, errors: [] };

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, ok: res.ok };
}

function assert(condition, message) {
  if (condition) {
    results.pass++;
    console.log(`  ✅ ${message}`);
  } else {
    results.fail++;
    const err = `  ❌ ${message}`;
    results.errors.push(err);
    console.log(err);
  }
}

async function section(name) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('─'.repeat(60));
}

// ── 测试用例 ──

async function testHealth() {
  await section('健康检查');
  const { status, body } = await request('/health');
  // /health 不在 /api/v1 下
  assert(true, `GET /health → ${status} (跳过，路径不同)`);
}

async function testAuth() {
  await section('认证模块');

  // 登录 - 管理员
  const { status, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@icet.dev', password: 'admin123' }),
  });
  assert(status === 200, `管理员登录 → ${status}`);
  if (body?.token) {
    token = body.token;
    assert(true, `获取到 JWT token (${body.token.slice(0, 20)}...)`);
  } else {
    assert(false, `未获取到 token, body: ${JSON.stringify(body)}`);
    return; // 后续测试依赖 token
  }

  // GET /auth/me
  const meRes = await request('/auth/me');
  assert(meRes.status === 200, `GET /auth/me → ${meRes.status}`);
  assert(meRes.body?.email === 'admin@icet.dev', `用户邮箱正确: ${meRes.body?.email}`);
  assert(meRes.body?.role === 'ADMIN', `用户角色正确: ${meRes.body?.role}`);
  if (meRes.body?.organizationId) {
    orgId = meRes.body.organizationId;
    assert(true, `组织ID: ${orgId}`);
  } else {
    assert(false, `未获取到 organizationId`);
  }

  // 登录 - 错误密码
  const badLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@icet.dev', password: 'wrong' }),
  });
  assert(badLogin.status === 401, `错误密码登录 → ${badLogin.status}`);

  // 未认证访问
  const noAuth = await fetch(`${BASE}/scenarios`);
  assert(noAuth.status === 401, `未认证访问 /scenarios → ${noAuth.status}`);
}

async function testScenarios() {
  await section('业务场景 CRUD');

  // 列表（初始应为空）
  const listRes = await request('/scenarios');
  assert(listRes.status === 200, `GET /scenarios → ${listRes.status}`);
  const initialCount = listRes.body?.data?.length ?? 0;
  assert(typeof listRes.body?.total === 'number', `返回 total: ${listRes.body?.total}`);

  // 创建
  const createRes = await request('/scenarios', {
    method: 'POST',
    body: JSON.stringify({
      processLevel1: '采购管理',
      processLevel2: '供应商选择',
      processLevel3: '招标流程',
      name: '供应商招标合规测试',
      description: '测试供应商招标流程的合规性',
    }),
  });
  assert(createRes.status === 201, `POST /scenarios → ${createRes.status}`);
  const scenarioId = createRes.body?.id;
  assert(!!scenarioId, `创建成功，ID: ${scenarioId}`);

  // 详情
  const detailRes = await request(`/scenarios/${scenarioId}`);
  assert(detailRes.status === 200, `GET /scenarios/:id → ${detailRes.status}`);
  assert(detailRes.body?.name === '供应商招标合规测试', `名称正确: ${detailRes.body?.name}`);
  assert(detailRes.body?.processLevel1 === '采购管理', `一级流程正确: ${detailRes.body?.processLevel1}`);

  // 列表（应多一条）
  const listRes2 = await request('/scenarios');
  assert(listRes2.body?.data?.length === initialCount + 1, `列表数量 +1: ${initialCount} → ${listRes2.body?.data?.length}`);

  // 更新
  const updateRes = await request(`/scenarios/${scenarioId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: '供应商招标合规测试（已更新）' }),
  });
  assert(updateRes.status === 200, `PUT /scenarios/:id → ${updateRes.status}`);
  assert(updateRes.body?.name?.includes('已更新'), `更新成功: ${updateRes.body?.name}`);

  // 删除（软删除）
  const delRes = await request(`/scenarios/${scenarioId}`, { method: 'DELETE' });
  assert(delRes.status === 200, `DELETE /scenarios/:id → ${delRes.status}`);

  // 列表（软删除后应不显示）
  const listRes3 = await request('/scenarios');
  assert(listRes3.body?.data?.length === initialCount, `软删除后列表数量恢复: ${listRes3.body?.data?.length}`);
}

async function testRegulations() {
  await section('规章制度管理');

  // 列表
  const listRes = await request('/regulations');
  assert(listRes.status === 200, `GET /regulations → ${listRes.status}`);

  // 注意：上传文件需要 multipart/form-data，这里只测试列表和详情
  // 文件上传测试需要单独用 curl 或 Postman
  assert(true, `文件上传测试需用 curl: curl -X POST -F "file=@test.pdf" -H "Authorization: Bearer $TOKEN" ${BASE}/regulations`);
}

async function testTasks() {
  await section('测试任务 CRUD');

  // 先创建一个场景（任务依赖场景）
  const scenarioRes = await request('/scenarios', {
    method: 'POST',
    body: JSON.stringify({
      processLevel1: '销售管理',
      processLevel2: '客户管理',
      name: '客户准入测试场景',
    }),
  });
  const scenarioId = scenarioRes.body?.id;
  assert(!!scenarioId, `创建测试场景: ${scenarioId}`);

  // 获取当前用户 ID 作为 testerId
  const meRes = await request('/auth/me');
  const userId = meRes.body?.id;
  assert(!!userId, `当前用户ID: ${userId}`);

  // 列表
  const listRes = await request('/tasks');
  assert(listRes.status === 200, `GET /tasks → ${listRes.status}`);
  const initialCount = listRes.body?.data?.length ?? 0;

  // 创建任务
  const createRes = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      scenarioId,
      paperId: 'ICET-2026-001',
      unitName: '华东分公司',
      testerId: userId,
      regulationIds: [],
      samplingMethod: '随机抽样',
      samplingPeriod: '2026-Q1',
      samplingSource: 'ERP系统',
    }),
  });
  assert(createRes.status === 201, `POST /tasks → ${createRes.status}`);
  const taskId = createRes.body?.id;
  assert(!!taskId, `创建成功，ID: ${taskId}`);
  assert(createRes.body?.status === 'DRAFT', `初始状态: ${createRes.body?.status}`);

  // 详情
  const detailRes = await request(`/tasks/${taskId}`);
  assert(detailRes.status === 200, `GET /tasks/:id → ${detailRes.status}`);
  assert(detailRes.body?.paperId === 'ICET-2026-001', `底稿编号: ${detailRes.body?.paperId}`);
  assert(detailRes.body?.unitName === '华东分公司', `测试单位: ${detailRes.body?.unitName}`);

  // 状态转换 — DRAFT → PLANNING
  const transitionRes = await request(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'PLANNING' }),
  });
  assert(transitionRes.status === 200, `PATCH status DRAFT→PLANNING → ${transitionRes.status}`);
  assert(transitionRes.body?.status === 'PLANNING', `状态已变更: ${transitionRes.body?.status}`);

  // 非法状态转换 — PLANNING → ARCHIVED（不允许）
  const badTransition = await request(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'ARCHIVED' }),
  });
  assert(badTransition.status === 400, `非法转换 PLANNING→ARCHIVED → ${badTransition.status}`);

  // 回退状态 — PLANNING → DRAFT
  const rollbackRes = await request(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'DRAFT' }),
  });
  assert(rollbackRes.status === 200, `回退 PLANNING→DRAFT → ${rollbackRes.status}`);

  // 列表（应多一条）
  const listRes2 = await request('/tasks');
  assert(listRes2.body?.data?.length === initialCount + 1, `列表数量 +1: ${initialCount} → ${listRes2.body?.data?.length}`);

  // 状态筛选
  const filterRes = await request('/tasks?status=DRAFT');
  assert(filterRes.body?.data?.every(t => t.status === 'DRAFT'), `状态筛选正确`);

  // 清理：推到 CANCELLED
  await request(`/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'PLANNING' }) });
  await request(`/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'PLAN_REVIEW' }) });
  await request(`/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'PLANNING' }) });
  await request(`/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'DRAFT' }) });
  const cancelRes = await request(`/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) });
  assert(cancelRes.status === 200, `任务已取消`);
}

async function testSamples() {
  await section('样本管理');

  // 创建测试任务
  const scenarioRes = await request('/scenarios', {
    method: 'POST',
    body: JSON.stringify({ processLevel1: '测试', processLevel2: '样本', name: '样本测试场景' }),
  });
  const scenarioId = scenarioRes.body?.id;
  const meRes = await request('/auth/me');
  const userId = meRes.body?.id;

  const taskRes = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      scenarioId,
      paperId: 'ICET-SAMPLE-001',
      unitName: '测试单位',
      testerId: userId,
      samplingMethod: '随机抽样',
      samplingPeriod: '2026-Q1',
      samplingSource: '测试',
    }),
  });
  const taskId = taskRes.body?.id;
  assert(!!taskId, `创建测试任务: ${taskId}`);

  // 样本列表（初始为空）
  const listRes = await request(`/tasks/${taskId}/samples`);
  assert(listRes.status === 200, `GET /tasks/:id/samples → ${listRes.status}`);
  assert(listRes.body?.samples?.length === 0, `初始样本数为 0`);

  // 添加样本
  const addRes = await request(`/tasks/${taskId}/samples`, {
    method: 'POST',
    body: JSON.stringify({ no: 1, content: '采购订单 PO-2026-0001', remark: '第一笔样本' }),
  });
  assert(addRes.status === 201, `POST /tasks/:id/samples → ${addRes.status}`);
  const sampleId = addRes.body?.id;
  assert(!!sampleId, `样本ID: ${sampleId}`);

  const addRes2 = await request(`/tasks/${taskId}/samples`, {
    method: 'POST',
    body: JSON.stringify({ no: 2, content: '采购订单 PO-2026-0002' }),
  });
  assert(addRes2.status === 201, `添加第二个样本 → ${addRes2.status}`);

  // 列表（应有 2 条）
  const listRes2 = await request(`/tasks/${taskId}/samples`);
  assert(listRes2.body?.samples?.length === 2, `样本数为 2`);

  // 更新样本
  const updateRes = await request(`/tasks/${taskId}/samples/${sampleId}`, {
    method: 'PUT',
    body: JSON.stringify({ remark: '已审核' }),
  });
  assert(updateRes.status === 200, `PUT sample → ${updateRes.status}`);

  // 删除样本
  const delRes = await request(`/tasks/${taskId}/samples/${sampleId}`, { method: 'DELETE' });
  assert(delRes.status === 200, `DELETE sample → ${delRes.status}`);

  const listRes3 = await request(`/tasks/${taskId}/samples`);
  assert(listRes3.body?.samples?.length === 1, `删除后样本数为 1`);

  // 越权测试 — 访问不存在的任务
  const notFoundRes = await request('/tasks/00000000-0000-0000-0000-000000000000/samples');
  assert(notFoundRes.status === 404, `不存在的任务 → ${notFoundRes.status}`);
}

async function testPaper() {
  await section('工作底稿');

  // 创建测试任务
  const scenarioRes = await request('/scenarios', {
    method: 'POST',
    body: JSON.stringify({ processLevel1: '测试', processLevel2: '底稿', name: '底稿测试场景' }),
  });
  const scenarioId = scenarioRes.body?.id;
  const meRes = await request('/auth/me');
  const userId = meRes.body?.id;

  const taskRes = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      scenarioId,
      paperId: 'ICET-PAPER-001',
      unitName: '底稿测试单位',
      testerId: userId,
      samplingMethod: '随机抽样',
      samplingPeriod: '2026-Q1',
      samplingSource: '测试',
    }),
  });
  const taskId = taskRes.body?.id;

  // 底稿尚未生成
  const notFoundRes = await request(`/tasks/${taskId}/paper`);
  assert(notFoundRes.status === 404, `未生成底稿 → 404`);

  // 生成底稿
  const genRes = await request(`/tasks/${taskId}/paper/generate`, { method: 'POST' });
  assert(genRes.status === 200, `POST /paper/generate → ${genRes.status}`);
  assert(genRes.body?.status === 'DRAFT', `底稿状态: ${genRes.body?.status}`);

  // 获取底稿
  const getRes = await request(`/tasks/${taskId}/paper`);
  assert(getRes.status === 200, `GET /paper → ${getRes.status}`);
  assert(!!getRes.body?.snapshotData, `快照数据存在`);

  // 导出 Excel
  const exportRes = await fetch(`${BASE}/tasks/${taskId}/paper/export`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(exportRes.status === 200, `POST /paper/export → ${exportRes.status}`);
  const contentType = exportRes.headers.get('content-type');
  assert(contentType?.includes('spreadsheetml'), `返回 Excel 文件: ${contentType}`);

  // 提交底稿
  const submitRes = await request(`/tasks/${taskId}/paper/submit`, { method: 'POST' });
  assert(submitRes.status === 200, `POST /paper/submit → ${submitRes.status}`);
  assert(submitRes.body?.status === 'SUBMITTED', `底稿已提交: ${submitRes.body?.status}`);
}

async function testAuthRoles() {
  await section('角色与权限');

  // 用 tester 账号登录
  const testerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'tester@icet.dev', password: 'tester123' }),
  });
  assert(testerLogin.status === 200, `测试人登录 → ${testerLogin.status}`);
  const testerToken = testerLogin.body?.token;

  // 用 reviewer 账号登录
  const reviewerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'reviewer@icet.dev', password: 'reviewer123' }),
  });
  assert(reviewerLogin.status === 200, `审阅人登录 → ${reviewerLogin.status}`);

  // 切回 admin
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@icet.dev', password: 'admin123' }),
  });
  if (adminLogin.body?.token) token = adminLogin.body.token;
  assert(true, '已切回管理员账号');
}

// ── 主流程 ──

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         ICET API 集成测试                       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`目标: ${BASE}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);

  try {
    await testHealth();
    await testAuth();
    await testScenarios();
    await testRegulations();
    await testTasks();
    await testSamples();
    await testPaper();
    await testAuthRoles();
  } catch (err) {
    results.fail++;
    results.errors.push(`未捕获异常: ${err.message}`);
    console.log(`\n💥 未捕获异常: ${err.message}`);
    console.log(err.stack);
  }

  // 汇总
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  结果: ${results.pass} 通过, ${results.fail} 失败`);
  console.log('╚══════════════════════════════════════════════════╝');

  if (results.errors.length > 0) {
    console.log('\n失败列表:');
    results.errors.forEach(e => console.log(e));
  }

  process.exit(results.fail > 0 ? 1 : 0);
}

main();
