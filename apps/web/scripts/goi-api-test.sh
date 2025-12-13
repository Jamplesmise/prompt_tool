#!/bin/bash
# GOI API 在线测试脚本

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_FILE="/tmp/goi_test_cookies.txt"
SESSION_ID="goi-test-$(date +%s)"
MODEL_ID=""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "GOI API 在线测试"
echo "========================================"
echo "Base URL: $BASE_URL"
echo "Session ID: $SESSION_ID"
echo ""

# 1. 登录
echo -e "${YELLOW}[1/10] 登录测试${NC}"
LOGIN_RESULT=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}')

if echo "$LOGIN_RESULT" | grep -q '"code":200'; then
  echo -e "${GREEN}✓ 登录成功${NC}"
  echo "  $(echo "$LOGIN_RESULT" | grep -o '"name":"[^"]*"')"
else
  echo -e "${RED}✗ 登录失败: $LOGIN_RESULT${NC}"
  exit 1
fi

# 2. 获取模型列表
echo -e "\n${YELLOW}[2/10] 获取模型列表${NC}"
MODELS_RESULT=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/v1/models")

if echo "$MODELS_RESULT" | grep -q '"code":200'; then
  MODEL_ID=$(echo "$MODELS_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  MODEL_COUNT=$(echo "$MODELS_RESULT" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}✓ 获取模型成功，共 $MODEL_COUNT 个模型${NC}"
  echo "  使用模型 ID: $MODEL_ID"
else
  echo -e "${RED}✗ 获取模型失败: $MODELS_RESULT${NC}"
  exit 1
fi

# 3. 启动 Agent
echo -e "\n${YELLOW}[3/10] 启动 Agent (agent/start)${NC}"
START_RESULT=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/goi/agent/start" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"goal\": \"查看任务列表\", \"mode\": \"assisted\", \"modelId\": \"$MODEL_ID\"}")

if echo "$START_RESULT" | grep -q '"code":200'; then
  TODO_COUNT=$(echo "$START_RESULT" | grep -o '"totalItems":[0-9]*' | head -1 | cut -d':' -f2)
  LATENCY=$(echo "$START_RESULT" | grep -o '"latencyMs":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}✓ Agent 启动成功${NC}"
  echo "  生成 TODO 项: $TODO_COUNT"
  echo "  延迟: ${LATENCY}ms"
else
  echo -e "${RED}✗ Agent 启动失败: $START_RESULT${NC}"
  exit 1
fi

# 4. 获取 Agent 状态
echo -e "\n${YELLOW}[4/10] 获取 Agent 状态 (agent/status)${NC}"
STATUS_RESULT=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/goi/agent/status?sessionId=$SESSION_ID")

if echo "$STATUS_RESULT" | grep -q '"code":200'; then
  AGENT_STATUS=$(echo "$STATUS_RESULT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✓ 获取状态成功: $AGENT_STATUS${NC}"
else
  echo -e "${RED}✗ 获取状态失败: $STATUS_RESULT${NC}"
fi

# 5. 获取协作状态
echo -e "\n${YELLOW}[5/10] 获取协作状态 (collaboration/status)${NC}"
COLLAB_RESULT=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/goi/collaboration/status?sessionId=$SESSION_ID")

if echo "$COLLAB_RESULT" | grep -q '"code":200'; then
  CONTROLLER=$(echo "$COLLAB_RESULT" | grep -o '"controller":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ 获取协作状态成功: controller=$CONTROLLER${NC}"
else
  echo -e "${RED}✗ 获取协作状态失败: $COLLAB_RESULT${NC}"
fi

# 6. 获取待处理检查点
echo -e "\n${YELLOW}[6/10] 获取待处理检查点 (checkpoint/pending)${NC}"
CHECKPOINT_RESULT=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/goi/checkpoint/pending?sessionId=$SESSION_ID")

if echo "$CHECKPOINT_RESULT" | grep -q '"code":200'; then
  CHECKPOINT_COUNT=$(echo "$CHECKPOINT_RESULT" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}✓ 获取检查点成功: $CHECKPOINT_COUNT 个待处理${NC}"
else
  echo -e "${RED}✗ 获取检查点失败: $CHECKPOINT_RESULT${NC}"
fi

# 7. 执行单步 (step)
echo -e "\n${YELLOW}[7/10] 执行单步 (agent/step)${NC}"
STEP_RESULT=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/goi/agent/step" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}")

if echo "$STEP_RESULT" | grep -q '"code":200'; then
  CURRENT_ITEM=$(echo "$STEP_RESULT" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4)
  ITEM_STATUS=$(echo "$STEP_RESULT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  PROGRESS=$(echo "$STEP_RESULT" | grep -o '"progress":[0-9]*' | head -1 | cut -d':' -f2)
  echo -e "${GREEN}✓ 单步执行成功${NC}"
  echo "  当前项: $CURRENT_ITEM"
  echo "  状态: $ITEM_STATUS"
  echo "  进度: $PROGRESS%"
else
  echo -e "${RED}✗ 单步执行失败: $STEP_RESULT${NC}"
fi

# 8. 暂停 Agent (使用 pause action)
echo -e "\n${YELLOW}[8/10] 暂停/恢复 Agent (agent/pause)${NC}"
# pause API 需要 action 参数
PAUSE_RESULT=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/goi/agent/pause" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"action\": \"pause\"}")

if echo "$PAUSE_RESULT" | grep -q '"code":200'; then
  echo -e "${GREEN}✓ 暂停成功${NC}"
else
  # 可能当前状态不是 running，这是正常的
  echo -e "${YELLOW}! 暂停响应: $(echo "$PAUSE_RESULT" | grep -o '"message":"[^"]*"')${NC}"
fi

# 尝试恢复 (action: resume)
RESUME_RESULT=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/goi/agent/pause" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"action\": \"resume\"}")

if echo "$RESUME_RESULT" | grep -q '"code":200'; then
  echo -e "${GREEN}✓ 恢复成功${NC}"
else
  echo -e "${YELLOW}! 恢复响应: $(echo "$RESUME_RESULT" | grep -o '"message":"[^"]*"')${NC}"
fi

# 9. 从 TODO List 恢复 Agent (agent/resume API - 用于从已保存的 TODO List 恢复)
echo -e "\n${YELLOW}[9/10] 从 TODO List 恢复 (agent/resume)${NC}"
# 从 START_RESULT 中提取 todoListId
TODO_LIST_ID=$(echo "$START_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  TODO List ID: $TODO_LIST_ID"

# resume API 需要 todoListId 和 modelId
RESUME_API_RESULT=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/goi/agent/resume" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"${SESSION_ID}-resume\", \"todoListId\": \"$TODO_LIST_ID\", \"modelId\": \"$MODEL_ID\"}")

if echo "$RESUME_API_RESULT" | grep -q '"code":200'; then
  echo -e "${GREEN}✓ 从 TODO List 恢复成功${NC}"
else
  echo -e "${YELLOW}! 恢复响应: $(echo "$RESUME_API_RESULT" | grep -o '"message":"[^"]*"')${NC}"
fi

# 10. 切换协作模式
echo -e "\n${YELLOW}[10/10] 切换协作模式 (collaboration/mode)${NC}"
MODE_RESULT=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/goi/collaboration/mode" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"mode\": \"auto\"}")

if echo "$MODE_RESULT" | grep -q '"code":200'; then
  NEW_MODE=$(echo "$MODE_RESULT" | grep -o '"mode":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ 模式切换成功: $NEW_MODE${NC}"
else
  echo -e "${YELLOW}! 模式切换响应: $(echo "$MODE_RESULT" | grep -o '"message":"[^"]*"')${NC}"
fi

# 清理
rm -f "$COOKIE_FILE"

echo ""
echo "========================================"
echo -e "${GREEN}GOI API 在线测试完成${NC}"
echo "========================================"
