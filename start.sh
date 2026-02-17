#!/bin/bash
# 前端启动脚本 - 支持多环境，后台运行

# 用法: ./start.sh [dev|build]
# dev: 开发环境 (npm run dev)
# build: 生产环境 (npm run build + serve dist)

MODE=${1:-dev}
LOG_DIR="$(dirname "$0")/logs"
PID_DIR="$(dirname "$0")/pids"

# 创建日志和PID目录
mkdir -p "$LOG_DIR" "$PID_DIR"

echo "=========================================="
echo "  基金管理系统 - 前端启动"
echo "=========================================="
echo "启动模式: $MODE"
echo "=========================================="

# 检查端口
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

if [ "$MODE" = "dev" ]; then
    # 开发环境
    echo "启动开发服务器..."
    
    if check_port 5173; then
        echo "警告: 端口5173已被占用"
        echo "请先停止现有服务或使用其他端口"
        exit 1
    fi
    
    nohup npm run dev > "$LOG_DIR/front-dev.log" 2>&1 &
    PID=$!
    echo $PID > "$PID_DIR/front-dev.pid"
    
    sleep 3
    
    if kill -0 $PID 2>/dev/null; then
        echo "前端开发服务启动成功 (PID: $PID)"
        echo "访问地址: http://localhost:5173"
    else
        echo "错误: 前端服务启动失败"
        echo "请查看日志: $LOG_DIR/front-dev.log"
        exit 1
    fi

elif [ "$MODE" = "build" ]; then
    # 生产环境 - 构建并启动静态服务器
    echo "构建生产版本..."
    npm run build
    
    if [ ! -d "dist" ]; then
        echo "错误: 构建失败，未找到dist目录"
        exit 1
    fi
    
    # 检查是否有serve
    if ! command -v serve &> /dev/null; then
        echo "安装serve..."
        npm install -g serve
    fi
    
    if check_port 80; then
        echo "警告: 端口80已被占用"
        echo "使用端口8080..."
        PORT=8080
    else
        PORT=80
    fi
    
    echo "启动静态服务器 (端口: $PORT)..."
    nohup serve -s dist -l $PORT > "$LOG_DIR/front-prod.log" 2>&1 &
    PID=$!
    echo $PID > "$PID_DIR/front-prod.pid"
    
    sleep 2
    
    if kill -0 $PID 2>/dev/null; then
        echo "前端生产服务启动成功 (PID: $PID)"
        echo "访问地址: http://localhost:$PORT"
    else
        echo "错误: 前端服务启动失败"
        echo "请查看日志: $LOG_DIR/front-prod.log"
        exit 1
    fi

else
    echo "用法: ./start.sh [dev|build]"
    echo "  dev   - 开发环境 (默认)"
    echo "  build - 生产环境"
    exit 1
fi
