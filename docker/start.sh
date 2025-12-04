#!/bin/sh
set -e

echo "🚀 Starting AI Model Testing Platform..."

# 运行数据库迁移（如果需要）
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "📊 Running database migrations..."
  cd /app/apps/web && npx prisma migrate deploy
fi

# 禁用 Next.js instrumentation 中的 Worker（我们使用独立进程）
export DISABLE_INSTRUMENTATION_WORKER=true

# 启动 Worker 进程（后台）
echo "⚙️ Starting Worker process..."
npx tsx /app/apps/web/src/worker.ts &
WORKER_PID=$!

# 启动 Web 服务（前台）
echo "🌐 Starting Web server..."
node /app/apps/web/server.js &
WEB_PID=$!

# 等待任一进程退出
wait -n $WORKER_PID $WEB_PID

# 如果有一个进程退出，杀死另一个
EXIT_CODE=$?
echo "❌ Process exited with code $EXIT_CODE"
kill $WORKER_PID $WEB_PID 2>/dev/null || true
exit $EXIT_CODE
