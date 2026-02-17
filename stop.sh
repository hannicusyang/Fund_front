#!/bin/bash
# 前端停止脚本

MODE=${1:-dev}
PID_DIR="$(dirname "$0")/pids"

echo "=========================================="
echo "  基金管理系统 - 前端停止"
echo "=========================================="

if [ "$MODE" = "dev" ]; then
    PID_FILE="$PID_DIR/front-dev.pid"
elif [ "$MODE" = "build" ]; then
    PID_FILE="$PID_DIR/front-prod.pid"
else
    echo "用法: ./stop.sh [dev|build]"
    exit 1
fi

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 $PID 2>/dev/null; then
        echo "正在停止前端服务 (PID: $PID)..."
        kill $PID
        sleep 1
        if kill -0 $PID 2>/dev/null; then
            kill -9 $PID
        fi
        echo "前端服务已停止"
    else
        echo "前端服务未运行"
    fi
    rm -f "$PID_FILE"
else
    echo "未找到PID文件，尝试通过端口查找..."
    
    if [ "$MODE" = "dev" ]; then
        PID=$(lsof -ti:5173 2>/dev/null)
    else
        PID=$(lsof -ti:80 2>/dev/null)
    fi
    
    if [ -n "$PID" ]; then
        echo "发现进程 $PID，是否停止? (y/n)"
        read -r answer
        if [ "$answer" = "y" ]; then
            kill $PID
            echo "已停止"
        fi
    else
        echo "未发现运行的前端服务"
    fi
fi
