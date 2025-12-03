# Sandbox Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装 Python（如果需要 Python 评估器）
# RUN apk add --no-cache python3 py3-pip

COPY apps/sandbox/package.json ./
RUN npm install --production

COPY apps/sandbox/dist ./dist

# 创建非 root 用户
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox
USER sandbox

EXPOSE 3001

CMD ["node", "dist/server.js"]
