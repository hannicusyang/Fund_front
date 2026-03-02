<template>
  <div class="stock-analysis-container">
    <!-- 股票备选池 -->
    <a-card title="📋 股票备选池" class="pool-card" size="small">
      <div class="stock-pool">
        <span 
          v-for="stock in stockPool" 
          :key="stock.code"
          class="pool-item-wrapper"
        >
          <a-tag 
            :color="stockCode === stock.code ? 'blue' : 'default'"
            closable
            @close.prevent="confirmDelete(stock)"
            @click="selectStock(stock.code)"
          >
            {{ stock.name }} ({{ stock.code }})
          </a-tag>
        </span>
        <span v-if="stockPool.length === 0" class="no-data">暂无自选股票</span>
      </div>
    </a-card>

    <!-- 删除确认弹窗 -->
    <a-modal
      v-model:open="deleteModal.visible"
      title="确认删除"
      @ok="handleDelete"
      @cancel="deleteModal.visible = false"
      :confirmLoading="deleteModal.loading"
    >
      <p>确定要从自选池中删除 <b>{{ deleteModal.stock?.name }}</b> 吗？</p>
    </a-modal>

    <!-- 股票搜索区域 -->
    <a-card class="search-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="6">
          <a-input-search
            v-model:value="stockCode"
            placeholder="输入股票代码 (如 600519)"
            enter-button
            @search="onSearch"
            :loading="loading"
            size="large"
          />
        </a-col>
        <a-col :xs="24" :sm="12" :md="18">
          <a-space>
            <a-select v-model:value="timeRange" style="width: 130px" @change="onTimeRangeChange" size="large">
              <a-select-option value="1m">近1月</a-select-option>
              <a-select-option value="3m">近3月</a-select-option>
              <a-select-option value="6m">近6月</a-select-option>
              <a-select-option value="1y">近1年</a-select-option>
              <a-select-option value="2y">近2年</a-select-option>
            </a-select>
            <a-radio-group v-model:value="chartType" button-style="solid" size="large" @change="onChartTypeChange">
              <a-radio-button value="kline">K线</a-radio-button>
              <a-radio-button value="line">收盘线</a-radio-button>
            </a-radio-group>
            <a-button @click="refreshData" :loading="loading" size="large">
              <ReloadOutlined /> 刷新数据
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- 股票基本信息 - 多宫格卡片式 -->
      <div v-if="currentStock" class="stock-info">
        <a-divider />
        <a-row :gutter="[12, 12]">
          <a-col :xs="12" :sm="8" :md="4">
            <div class="stock-card name-card">
              <div class="card-icon">🏷️</div>
              <div class="card-content">
                <span class="card-label">股票名称</span>
                <span class="card-value name">{{ currentStock.name }}</span>
              </div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="8" :md="4">
            <div class="stock-card price-card">
              <div class="card-icon">💰</div>
              <div class="card-content">
                <span class="card-label">最新价</span>
                <span class="card-value price" :class="getPriceClass(currentStock.change)">
                  {{ currentStock.price?.toFixed(2) }}
                </span>
              </div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="8" :md="4">
            <div class="stock-card" :class="currentStock.change >= 0 ? 'up-card' : 'down-card'">
              <div class="card-icon">{{ currentStock.change > 0 ? '📈' : '📉' }}</div>
              <div class="card-content">
                <span class="card-label">涨跌幅</span>
                <span class="card-value" :class="getPriceClass(currentStock.change)">
                  {{ currentStock.change > 0 ? '+' : '' }}{{ currentStock.change?.toFixed(2) }}%
                </span>
              </div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="8" :md="4">
            <div class="stock-card">
              <div class="card-icon">📊</div>
              <div class="card-content">
                <span class="card-label">成交量</span>
                <span class="card-value">{{ formatVolume(currentStock.volume) }}</span>
              </div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="8" :md="4">
            <div class="stock-card">
              <div class="card-icon">💵</div>
              <div class="card-content">
                <span class="card-label">成交额</span>
                <span class="card-value">{{ formatAmount(currentStock.amount) }}</span>
              </div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="8" :md="4">
            <div class="stock-card up-card">
              <div class="card-icon">⬆️</div>
              <div class="card-content">
                <span class="card-label">最高</span>
                <span class="card-value up">{{ currentStock.high?.toFixed(2) }}</span>
              </div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="8" :md="4">
            <div class="stock-card down-card">
              <div class="card-icon">⬇️</div>
              <div class="card-content">
                <span class="card-label">最低</span>
                <span class="card-value down">{{ currentStock.low?.toFixed(2) }}</span>
              </div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="8" :md="4">
            <div class="stock-card">
              <div class="card-icon">📅</div>
              <div class="card-content">
                <span class="card-label">更新时间</span>
                <span class="card-value time">{{ currentStock.updateTime }}</span>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>
    </a-card>

    <!-- 综合分析报告 -->
    <a-card v-if="currentStock && analysisReport" class="analysis-report-card" :bordered="false">
      <div class="analysis-header">
        <span class="title">📊 综合技术分析报告</span>
        <a-tag :color="analysisReport.overallTrend === '强势上涨' ? 'red' : analysisReport.overallTrend === '弱势下跌' ? 'green' : 'orange'" style="font-size: 14px; padding: 4px 12px;">
          {{ analysisReport.overallTrend }}
        </a-tag>
      </div>
      
      <!-- 核心指标展示 -->
      <div class="core-indicators">
        <div class="core-item trend">
          <div class="core-icon">📈</div>
          <div class="core-content">
            <span class="core-label">趋势判断</span>
            <span class="core-value">{{ analysisReport.trend }}</span>
          </div>
        </div>
        <div class="core-item support">
          <div class="core-icon">⬇️</div>
          <div class="core-content">
            <span class="core-label">支撑位</span>
            <span class="core-value">{{ analysisReport.support }}</span>
          </div>
        </div>
        <div class="core-item resistance">
          <div class="core-icon">⬆️</div>
          <div class="core-content">
            <span class="core-label">压力位</span>
            <span class="core-value">{{ analysisReport.resistance }}</span>
          </div>
        </div>
        <div class="core-item volatility">
          <div class="core-icon">📊</div>
          <div class="core-content">
            <span class="core-label">波动率</span>
            <span class="core-value">{{ analysisReport.volatility }}%</span>
          </div>
        </div>
        <div class="core-item risk">
          <div class="core-icon">⚠️</div>
          <div class="core-content">
            <span class="core-label">风险等级</span>
            <a-tag :color="analysisReport.riskLevel === '较高' ? 'red' : analysisReport.riskLevel === '较低' ? 'green' : 'orange'" style="margin-top: 4px;">
              {{ analysisReport.riskLevel }}
            </a-tag>
          </div>
        </div>
      </div>
      
      <!-- 快速指标 -->
      <a-row :gutter="16" class="quick-indicators">
        <a-col :xs="12" :sm="8" v-if="keyIndicators">
          <div class="quick-item">
            <span class="label">最新价</span>
            <span class="value">{{ keyIndicators.latestPrice?.toFixed(2) }}</span>
          </div>
        </a-col>
        <a-col :xs="12" :sm="8" v-if="keyIndicators">
          <div class="quick-item">
            <span class="label">涨跌幅</span>
            <span class="value" :class="keyIndicators.changePercent >= 0 ? 'up' : 'down'">
              {{ keyIndicators.changePercent?.toFixed(2) }}%
            </span>
          </div>
        </a-col>
        <a-col :xs="12" :sm="8" v-if="keyIndicators">
          <div class="quick-item">
            <span class="label">成交量</span>
            <span class="value">{{ formatVolume(keyIndicators.volume) }}</span>
          </div>
        </a-col>
      </a-row>
    </a-card>

    <!-- 技术指标选择 -->
    <a-card title="📊 技术指标" class="indicator-card">
      <a-checkbox-group v-model:value="selectedIndicators" @change="onIndicatorChange">
        <a-row :gutter="[16, 8]">
          <a-col :xs="12" :sm="6">
            <a-checkbox value="ma">MA均线 (5/10/20/60)</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="macd">MACD</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="rsi">RSI</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="kdj">KDJ</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="boll">布林带</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="volume">成交量</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="dmi">DMI指标</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="obv">OBV能量潮</a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>

      <!-- 关键指标数值 -->
      <div v-if="currentStock && keyIndicators" class="key-indicators">
        <a-divider>关键指标</a-divider>
        <a-row :gutter="16">
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">MA5</span>
              <span class="value">{{ keyIndicators.ma5?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">MA10</span>
              <span class="value">{{ keyIndicators.ma10?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">MA20</span>
              <span class="value">{{ keyIndicators.ma20?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">MACD</span>
              <span class="value" :class="keyIndicators.macdBar > 0 ? 'up' : 'down'">
                {{ keyIndicators.macdBar?.toFixed(2) }}
              </span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">RSI(14)</span>
              <span class="value" :class="getRSIClass(keyIndicators.rsi)">
                {{ keyIndicators.rsi?.toFixed(1) }}
              </span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">KDJ(K)</span>
              <span class="value" :class="getKDJClass(keyIndicators.k)">
                {{ keyIndicators.k?.toFixed(1) }}
              </span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">DMI(+DI)</span>
              <span class="value">{{ keyIndicators.plusDi?.toFixed(1) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">ADX</span>
              <span class="value">{{ keyIndicators.adx?.toFixed(1) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">BOLL(上)</span>
              <span class="value">{{ keyIndicators.bollUpper?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">BOLL(中)</span>
              <span class="value">{{ keyIndicators.bollMiddle?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">BOLL(下)</span>
              <span class="value">{{ keyIndicators.bollLower?.toFixed(2) }}</span>
            </div>
          </a-col>
        </a-row>
      </div>
    </a-card>

    <!-- K线图 -->
    <a-card title="📈 K线走势图" class="chart-card">
      <div ref="klineChartRef" class="kline-chart"></div>
    </a-card>

    <!-- 技术指标图表 -->
    <a-row :gutter="16">
      <a-col :xs="24" :lg="12">
        <a-card title="MACD指标" class="sub-chart-card" v-if="selectedIndicators.includes('macd')">
          <div ref="macdChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="RSI指标" class="sub-chart-card" v-if="selectedIndicators.includes('rsi')">
          <div ref="rsiChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="KDJ指标" class="sub-chart-card" v-if="selectedIndicators.includes('kdj')">
          <div ref="kdjChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="成交量" class="sub-chart-card" v-if="selectedIndicators.includes('volume')">
          <div ref="volumeChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="DMI指标" class="sub-chart-card" v-if="selectedIndicators.includes('dmi')">
          <div ref="dmiChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="OBV能量潮" class="sub-chart-card" v-if="selectedIndicators.includes('obv')">
          <div ref="obvChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 技术信号 -->
    <a-card title="🎯 技术信号分析" class="signal-card" v-if="techSignals.length > 0">
      <a-tabs>
        <a-tab-pane key="signals" tab="买卖信号">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12" :md="8" v-for="signal in techSignals" :key="signal.indicator">
              <a-card size="small" :class="'signal-item ' + signal.type">
                <div class="signal-header">
                  <a-tag :color="signal.type === 'buy' ? 'green' : signal.type === 'sell' ? 'red' : 'orange'">
                    {{ signal.type === 'buy' ? '买入' : signal.type === 'sell' ? '卖出' : '观望' }}
                  </a-tag>
                  <a-tag :color="signal.level === 'strong' ? 'purple' : signal.level === 'medium' ? 'blue' : 'default'">
                    {{ signal.level === 'strong' ? '强' : signal.level === 'medium' ? '中' : '弱' }}
                  </a-tag>
                </div>
                <div class="indicator-name">{{ signal.indicator }}</div>
                <p class="description">{{ signal.description }}</p>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>
        <a-tab-pane key="analysis" tab="分析解读">
          <a-alert
            v-if="analysisReport"
            :message="analysisReport.overallTrend"
            :description="analysisReport.summary"
            :type="analysisReport.overallTrend?.includes('涨') ? 'success' : analysisReport.overallTrend?.includes('跌') ? 'error' : 'warning'"
            show-icon
            style="margin-bottom: 16px"
          />
          
          <!-- 自定义策略解读 -->
          <div v-if="customStrategySignals.length > 0" class="custom-strategy">
            <a-divider>📈 自定义策略解读</a-divider>
            <a-row :gutter="[12, 12]">
              <a-col :xs="24" :sm="12" v-for="signal in customStrategySignals" :key="signal.name">
                <a-card 
                  size="small" 
                  :class="'strategy-card ' + signal.status"
                >
                  <template #title>
                    <span>{{ signal.name }}</span>
                  </template>
                  <template #extra>
                    <a-tag :color="signal.status === 'bull' ? 'green' : signal.status === 'bear' ? 'red' : 'orange'">
                      {{ signal.status === 'bull' ? '✅ 主升浪' : signal.status === 'bear' ? '⚠️ 离场警惕' : '➖ 中性' }}
                    </a-tag>
                  </template>
                  <div class="strategy-content">
                    <div class="signal-item">
                      <span class="label">当前状态：</span>
                      <span class="value">{{ signal.current }}</span>
                    </div>
                    <div class="signal-item" v-if="signal.signal">
                      <span class="label">信号提示：</span>
                      <span class="value" :class="signal.status">{{ signal.signal }}</span>
                    </div>
                  </div>
                </a-card>
              </a-col>
            </a-row>
            
            <!-- 策略综合判断 -->
            <a-alert
              v-if="customStrategyConclusion"
              :message="customStrategyConclusion.title"
              :description="customStrategyConclusion.desc"
              :type="customStrategyConclusion.type"
              show-icon
              style="margin-top: 16px"
            />
          </div>
        </a-tab-pane>
        <a-tab-pane key="advice" tab="投资建议">
          <div v-if="investmentAdvice" class="investment-advice">
            <!-- 总体评估 -->
            <a-card size="small" class="advice-card overall">
              <template #title>
                <span>📊 综合评分</span>
              </template>
              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <div class="advice-item">
                    <div class="score-circle" :class="investmentAdvice.overallScore >= 70 ? 'green' : investmentAdvice.overallScore >= 40 ? 'orange' : 'red'">
                      {{ investmentAdvice.overallScore }}
                    </div>
                    <span class="score-label">综合评分</span>
                  </div>
                </a-col>
                <a-col :xs="24" :sm="16">
                  <div class="score-bars">
                    <div class="score-bar-item">
                      <span class="bar-label">均线趋势</span>
                      <a-progress :percent="investmentAdvice.scores.trendScore + 50" :showInfo="false" :strokeColor="investmentAdvice.scores.trendScore > 0 ? '#52c41a' : '#f5222d'" />
                      <span class="bar-value">{{ investmentAdvice.scores.trendScore > 0 ? '+' : '' }}{{ investmentAdvice.scores.trendScore }}</span>
                    </div>
                    <div class="score-bar-item">
                      <span class="bar-label">RSI指标</span>
                      <a-progress :percent="investmentAdvice.scores.rsiScore + 50" :showInfo="false" :strokeColor="investmentAdvice.scores.rsiScore > 0 ? '#52c41a' : '#f5222d'" />
                      <span class="bar-value">{{ investmentAdvice.scores.rsiScore > 0 ? '+' : '' }}{{ investmentAdvice.scores.rsiScore }}</span>
                    </div>
                    <div class="score-bar-item">
                      <span class="bar-label">MACD指标</span>
                      <a-progress :percent="investmentAdvice.scores.macdScore + 50" :showInfo="false" :strokeColor="investmentAdvice.scores.macdScore > 0 ? '#52c41a' : '#f5222d'" />
                      <span class="bar-value">{{ investmentAdvice.scores.macdScore > 0 ? '+' : '' }}{{ investmentAdvice.scores.macdScore }}</span>
                    </div>
                    <div class="score-bar-item">
                      <span class="bar-label">KDJ指标</span>
                      <a-progress :percent="investmentAdvice.scores.kdjScore + 50" :showInfo="false" :strokeColor="investmentAdvice.scores.kdjScore > 0 ? '#52c41a' : '#f5222d'" />
                      <span class="bar-value">{{ investmentAdvice.scores.kdjScore > 0 ? '+' : '' }}{{ investmentAdvice.scores.kdjScore }}</span>
                    </div>
                    <div class="score-bar-item">
                      <span class="bar-label">成交量能</span>
                      <a-progress :percent="investmentAdvice.scores.volScore + 50" :showInfo="false" :strokeColor="investmentAdvice.scores.volScore > 0 ? '#52c41a' : '#f5222d'" />
                      <span class="bar-value">{{ investmentAdvice.scores.volScore > 0 ? '+' : '' }}{{ investmentAdvice.scores.volScore }}</span>
                    </div>
                  </div>
                </a-col>
              </a-row>
            </a-card>
            
            <!-- 市场状态与风险 -->
            <a-row :gutter="16" style="margin-top: 16px">
              <a-col :xs="24" :sm="8">
                <a-card size="small" class="status-card">
                  <template #title>📈 市场状态</template>
                  <div class="status-value">
                    <a-tag :color="investmentAdvice.marketStatus === '多头' ? 'green' : investmentAdvice.marketStatus === '空头' ? 'red' : 'orange'" style="font-size: 16px; padding: 4px 12px;">
                      {{ investmentAdvice.marketStatus }}
                    </a-tag>
                  </div>
                  <p class="status-desc">{{ investmentAdvice.marketDesc }}</p>
                </a-card>
              </a-col>
              <a-col :xs="24" :sm="8">
                <a-card size="small" class="status-card">
                  <template #title>⚠️ 风险等级</template>
                  <div class="status-value">
                    <a-tag :color="investmentAdvice.riskLevel === '低' ? 'green' : investmentAdvice.riskLevel === '高' ? 'red' : 'orange'" style="font-size: 16px; padding: 4px 12px;">
                      {{ investmentAdvice.riskLevel }}风险
                    </a-tag>
                  </div>
                  <p class="status-desc">{{ investmentAdvice.riskDesc }}</p>
                </a-card>
              </a-col>
              <a-col :xs="24" :sm="8">
                <a-card size="small" class="status-card">
                  <template #title>📊 信号统计</template>
                  <div class="signal-stats">
                    <a-tag color="green">买入 {{ investmentAdvice.signalStats.buy }}</a-tag>
                    <a-tag color="red">卖出 {{ investmentAdvice.signalStats.sell }}</a-tag>
                    <a-tag color="default">观望 {{ investmentAdvice.signalStats.neutral }}</a-tag>
                  </div>
                </a-card>
              </a-col>
            </a-row>
            
            <!-- 操作建议 -->
            <a-card size="small" class="advice-card action" style="margin-top: 16px">
              <template #title>
                <span>💡 操作建议</span>
              </template>
              <a-alert
                :message="investmentAdvice.action.title"
                :description="investmentAdvice.action.description"
                :type="investmentAdvice.action.type"
                show-icon
                style="margin-bottom: 16px"
              />
              <a-descriptions :column="3" bordered size="small">
                <a-descriptions-item label="建议仓位">
                  <span style="font-weight: bold; color: #1890ff;">{{ investmentAdvice.action.position }}</span>
                </a-descriptions-item>
                <a-descriptions-item label="止盈位">
                  <span style="font-weight: bold; color: #52c41a;">{{ investmentAdvice.action.takeProfit }}</span>
                </a-descriptions-item>
                <a-descriptions-item label="止损位">
                  <span style="font-weight: bold; color: #f5222d;">{{ investmentAdvice.action.stopLoss }}</span>
                </a-descriptions-item>
              </a-descriptions>
            </a-card>
            
            <!-- 评分标准说明 -->
            <a-collapse style="margin-top: 16px">
              <a-collapse-panel key="1" header="📖 评分标准说明">
                <div class="score-legend">
                  <div class="legend-item">
                    <h4>评分体系：满分100分，基础分50分</h4>
                    <ul>
                      <li><b>均线趋势 (±30分)</b>：MA5>MA10>MA20多头排列+30分，空头排列-30分</li>
                      <li><b>RSI指标 (±20分)</b>：RSI<30超卖+20分，RSI>70超买-20分，RSI>50中性+10分</li>
                      <li><b>MACD指标 (±20分)</b>：金叉且红柱+20分，死叉且绿柱-20分</li>
                      <li><b>KDJ指标 (±15分)</b>：K值<20超卖+15分，K值>80超买-15分</li>
                      <li><b>成交量能 (±10分)</b>：放量上涨+10分，放量下跌-10分</li>
                    </ul>
                  </div>
                  <div class="legend-item">
                    <h4>评级标准：</h4>
                    <ul>
                      <li>🟢 70-100分：多头市场，积极建仓</li>
                      <li>🟡 40-69分：震荡整理，谨慎操作</li>
                      <li>🔴 0-39分：空头市场，建议回避</li>
                    </ul>
                  </div>
                </div>
              </a-collapse-panel>
            </a-collapse>
            
            <!-- 注意事项 -->
            <a-alert
              message="风险提示"
              description="本报告仅供参考，不构成投资建议。投资有风险，入市需谨慎。请根据自身风险承受能力做出投资决策。技术分析仅作为参考之一，建议结合基本面和市场环境综合判断。"
              type="warning"
              show-icon
              style="margin-top: 16px"
            />
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 数据信息 -->
    <a-card v-if="currentStock" class="info-card" size="small">
      <a-row :gutter="16">
        <a-col :span="12">
          <span class="info-text">数据更新: {{ currentStock.updateTime }}</span>
        </a-col>
        <a-col :span="12" style="text-align: right">
          <span class="info-text">数据来源: baostock</span>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import { stockAnalysisApi } from '@/api/stockModel.js'
import { stockApi } from '@/api/stock.js'

// 状态变量
const stockCode = ref('')

// 股票备选池
const stockPool = ref([])

// 移动端检测
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 加载自选股票池
const loadStockPool = async () => {
  try {
    const response = await stockApi.getStockWatchlist()
    // axios拦截器已经返回了response.data
    if (response.data) {
      stockPool.value = response.data.map(s => ({
        code: s.stock_code,
        name: s.stock_name
      }))
    }
  } catch (e) {
    console.error('加载自选股票失败', e)
  }
}

// 选择股票
const selectStock = (code) => {
  stockCode.value = code
  onSearch()
}

// 删除确认弹窗
const deleteModal = reactive({
  visible: false,
  loading: false,
  stock: null
})

// 确认删除
const confirmDelete = (stock) => {
  deleteModal.stock = stock
  deleteModal.visible = true
}

// 执行删除
const handleDelete = async () => {
  if (!deleteModal.stock) return
  
  deleteModal.loading = true
  try {
    await stockApi.removeFromWatchlist(deleteModal.stock.code)
    // 从列表中移除
    stockPool.value = stockPool.value.filter(s => s.code !== deleteModal.stock.code)
    message.success('已从自选池中删除')
    deleteModal.visible = false
  } catch (e) {
    message.error('删除失败: ' + e.message)
  } finally {
    deleteModal.loading = false
  }
}

const timeRange = ref('1y')
const chartType = ref('kline')
const loading = ref(false)
const currentStock = ref(null)
const techSignals = ref([])
const keyIndicators = ref(null)
const analysisReport = ref(null)
const investmentAdvice = ref(null)
const customStrategySignals = ref([])
const customStrategyConclusion = ref(null)
const selectedIndicators = ref(['ma', 'macd', 'rsi', 'kdj', 'volume', 'dmi', 'obv'])

// Chart refs
const klineChartRef = ref(null)
const macdChartRef = ref(null)
const rsiChartRef = ref(null)
const kdjChartRef = ref(null)
const volumeChartRef = ref(null)
const dmiChartRef = ref(null)
const obvChartRef = ref(null)

const charts = {}

// 初始化
onMounted(async () => {
  checkMobile()
  await loadStockPool()
  // 如果有自选股票，默认加载第一个
  if (stockPool.value.length > 0) {
    selectStock(stockPool.value[0].code)
  }
  // 延迟确保DOM渲染完成
  setTimeout(resizeCharts, 800)
})

onUnmounted(() => {
  Object.values(charts).forEach(chart => chart?.dispose())
})

// 搜索股票
const onSearch = async () => {
  if (!stockCode.value) {
    message.warning('请输入股票代码')
    return
  }
  
  loading.value = true
  
  try {
    const response = await stockAnalysisApi.getKlineWithIndicators(
      stockCode.value.trim(), 
      'daily'
    )
    
    if (response.success && response.data && response.data.length > 0) {
      const data = response.data
      const stockInfo = data[data.length - 1]
      
      currentStock.value = {
        code: stockCode.value.trim(),
        name: response.stock_name || stockInfo.name || stockCode.value,
        price: stockInfo.close,
        change: stockInfo.change_percent,
        volume: stockInfo.volume,
        amount: stockInfo.amount,
        high: stockInfo.high,
        low: stockInfo.low,
        updateTime: new Date().toLocaleString('zh-CN'),
        data: data
      }
      
      // 计算关键指标
      keyIndicators.value = calculateKeyIndicators(data)
      
      // 生成技术信号
      techSignals.value = generateSignalsFromData(data)
      
      // 生成分析报告
      analysisReport.value = generateAnalysisReport(data, techSignals.value)
      investmentAdvice.value = generateInvestmentAdvice(data, techSignals.value)
      
      // 生成自定义策略解读
      const strategyResult = generateCustomStrategyAnalysis(data)
      customStrategySignals.value = strategyResult.signals
      customStrategyConclusion.value = strategyResult.conclusion
      
      message.success(`已加载 ${currentStock.value.name} 数据`)
      
      await nextTick()
      renderCharts()
    } else {
      message.error(response.message || '未找到该股票数据')
    }
    
  } catch (error) {
    console.error('加载失败：', error)
    message.error('加载失败：' + (error.message || '请检查网络连接'))
  } finally {
    loading.value = false
  }
}

// 计算关键指标
function calculateKeyIndicators(data) {
  if (!data || data.length < 20) return null
  
  const latest = data[data.length - 1]  // 最新数据在最后
  return {
    latestPrice: latest.close,
    changePercent: latest.change_percent,
    volume: latest.volume,
    ma5: latest.ma5,
    ma10: latest.ma10,
    ma20: latest.ma20,
    macdBar: latest.macd?.bar,
    rsi: latest.rsi,
    k: latest.kdj?.k,
    d: latest.kdj?.d,
    j: latest.kdj?.j,
    plusDi: latest.dmi?.plus_di,
    minusDi: latest.dmi?.minus_di,
    adx: latest.dmi?.adx,
    obv: latest.obv,
    bollUpper: latest.boll?.upper,
    bollMiddle: latest.boll?.middle,
    bollLower: latest.boll?.lower
  }
}

// 生成技术信号
function generateSignalsFromData(data) {
  const signals = []
  if (!data || data.length < 2) return signals
  
  const lastIndex = data.length - 1
  const curr = data[data.length - 1]
  const prev = data[data.length - 2]
  const prev2 = data.length > 2 ? data[data.length - 3] : null
  
  // 提取高低点数据用于后续分析
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)
  
  // ===== MACD信号 =====
  if (curr.macd && prev.macd) {
    // 金叉/死叉
    if (curr.macd.dif > curr.macd.dea && prev.macd.dif <= prev.macd.dea) {
      signals.push({ indicator: 'MACD金叉', type: 'buy', level: 'strong', description: 'DIF上穿DEA，形成金叉，短期趋势转强，是积极买入信号' })
    } else if (curr.macd.dif < curr.macd.dea && prev.macd.dif >= prev.macd.dea) {
      signals.push({ indicator: 'MACD死叉', type: 'sell', level: 'strong', description: 'DIF下穿DEA，形成死叉，短期趋势转弱，注意风险' })
    }
    // 红绿柱
    if (curr.macd.bar > 0) {
      signals.push({ indicator: 'MACD红柱', type: 'buy', level: 'medium', description: '多头排列，红柱放大，上涨动能充足' })
    } else if (curr.macd.bar < 0) {
      signals.push({ indicator: 'MACD绿柱', type: 'sell', level: 'medium', description: '空头排列，绿柱放大，下跌动能较强' })
    }
    // 零轴位置
    if (curr.macd.dif > 0 && curr.macd.dea > 0) {
      signals.push({ indicator: 'MACD零轴上', type: 'buy', level: 'weak', description: 'DIF和DEA均在零轴上方，整体趋势偏多' })
    } else if (curr.macd.dif < 0 && curr.macd.dea < 0) {
      signals.push({ indicator: 'MACD零轴下', type: 'sell', level: 'weak', description: 'DIF和DEA均在零轴下方，整体趋势偏空' })
    }
  }
  
  // ===== RSI信号 =====
  if (curr.rsi) {
    const rsi = curr.rsi
    if (rsi < 20) {
      signals.push({ indicator: 'RSI超卖(极值)', type: 'buy', level: 'strong', description: `RSI=${rsi.toFixed(1)}极度超卖，市场可能出现严重超卖，反弹概率较高` })
    } else if (rsi < 30) {
      signals.push({ indicator: 'RSI超卖', type: 'buy', level: 'medium', description: `RSI=${rsi.toFixed(1)}处于超卖区域(30以下)，存在反弹机会` })
    } else if (rsi > 80) {
      signals.push({ indicator: 'RSI超买(极值)', type: 'sell', level: 'strong', description: `RSI=${rsi.toFixed(1)}极度超买，警惕回调风险` })
    } else if (rsi > 70) {
      signals.push({ indicator: 'RSI超买', type: 'sell', level: 'medium', description: `RSI=${rsi.toFixed(1)}处于超买区域(70以上)，注意回调风险` })
    } else if (rsi >= 40 && rsi <= 60) {
      signals.push({ indicator: 'RSI中性', type: 'neutral', level: 'weak', description: `RSI=${rsi.toFixed(1)}处于中性区域，方向不明确` })
    }
  }
  
  // ===== KDJ信号 =====
  if (curr.kdj) {
    // 超卖/超买
    if (curr.kdj.k < 20 && curr.kdj.j < 20) {
      signals.push({ indicator: 'KDJ超卖', type: 'buy', level: 'strong', description: `K=${curr.kdj.k.toFixed(1)}, J=${curr.kdj.j.toFixed(1)}，KDJ严重超卖，反弹概率大` })
    } else if (curr.kdj.k > 80 && curr.kdj.j > 80) {
      signals.push({ indicator: 'KDJ超买', type: 'sell', level: 'strong', description: `K=${curr.kdj.k.toFixed(1)}, J=${curr.kdj.j.toFixed(1)}，KDJ严重超买，注意回调` })
    }
    // 金叉/死叉
    if (curr.kdj.k > curr.kdj.d && prev.kdj.k <= prev.kdj.d) {
      signals.push({ indicator: 'KDJ金叉', type: 'buy', level: 'medium', description: 'K线上穿D线，形成金叉，短期看涨信号' })
    } else if (curr.kdj.k < curr.kdj.d && prev.kdj.k >= prev.kdj.d) {
      signals.push({ indicator: 'KDJ死叉', type: 'sell', level: 'medium', description: 'K线下穿D线，形成死叉，短期看跌信号' })
    }
    // J线触顶/触底
    if (curr.kdj.j < 0) {
      signals.push({ indicator: 'KDJ-J为负', type: 'buy', level: 'weak', description: 'J线低于0，短期内可能出现反弹' })
    } else if (curr.kdj.j > 100) {
      signals.push({ indicator: 'KDJ-J过高', type: 'sell', level: 'weak', description: 'J线超过100，短期内可能回调' })
    }
  }
  
  // ===== 布林带信号 =====
  if (curr.boll) {
    const position = ((curr.close - curr.boll.lower) / (curr.boll.upper - curr.boll.lower)) * 100
    if (curr.close < curr.boll.lower) {
      signals.push({ indicator: '布林下轨', type: 'buy', level: 'strong', description: `价格触及布林下轨(${curr.boll.lower.toFixed(2)})，超卖严重，反弹概率高` })
    } else if (curr.close > curr.boll.upper) {
      signals.push({ indicator: '布林上轨', type: 'sell', level: 'strong', description: `价格触及布林上轨(${curr.boll.upper.toFixed(2)})，超买严重，注意回调风险` })
    } else if (position < 20) {
      signals.push({ indicator: '布林下轨区域', type: 'buy', level: 'medium', description: `价格在布林下轨附近运行，处于相对低位` })
    } else if (position > 80) {
      signals.push({ indicator: '布林上轨区域', type: 'sell', level: 'medium', description: `价格在布林上轨附近运行，处于相对高位` })
    } else {
      signals.push({ indicator: '布林中轨区域', type: 'neutral', level: 'weak', description: `价格在布林中轨附近运行，震荡整理` })
    }
  }
  
  // ===== MA均线信号 =====
  if (curr.ma5 && curr.ma10 && curr.ma20 && curr.ma60) {
    const ma5 = curr.ma5, ma10 = curr.ma10, ma20 = curr.ma20, ma60 = curr.ma60
    const prevMa5 = prev.ma5, prevMa10 = prev.ma10, prevMa20 = prev.ma20
    
    // 多头排列
    if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
      signals.push({ indicator: '多头排列', type: 'buy', level: 'strong', description: 'MA5>MA10>MA20>MA60，长期趋势向上，是强势信号' })
    } else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60) {
      signals.push({ indicator: '空头排列', type: 'sell', level: 'strong', description: 'MA5<MA10<MA20<MA60，长期趋势向下，是弱势信号' })
    }
    // 短期均线上穿中期均线
    if (ma5 > ma10 && prevMa5 <= prevMa10) {
      signals.push({ indicator: 'MA5上穿MA10', type: 'buy', level: 'medium', description: '短期均线上穿中期均线，形成金叉，看涨' })
    } else if (ma5 < ma10 && prevMa5 >= prevMa10) {
      signals.push({ indicator: 'MA5下穿MA10', type: 'sell', level: 'medium', description: '短期均线下穿中期均线，形成死叉，看跌' })
    }
    // 站上/跌破均线
    if (curr.close > ma20 && prev.close <= prevMa20) {
      signals.push({ indicator: '突破MA20', type: 'buy', level: 'medium', description: '价格突破20日均线，短期转强' })
    } else if (curr.close < ma20 && prev.close >= prevMa20) {
      signals.push({ indicator: '跌破MA20', type: 'sell', level: 'medium', description: '价格跌破20日均线，短期转弱' })
    }
  }
  
  // ===== 成交量信号 =====
  if (curr.volume && data.length > 20) {
    const avgVol = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20
    const volRatio = curr.volume / avgVol
    
    if (volRatio > 2) {
      signals.push({ indicator: '放量暴涨/暴跌', type: curr.change > 0 ? 'buy' : 'sell', level: 'strong', description: `成交量是均量的${volRatio.toFixed(1)}倍，量价配合异常，关注趋势变化` })
    } else if (volRatio > 1.5) {
      signals.push({ indicator: '放量', type: curr.change > 0 ? 'buy' : 'sell', level: 'medium', description: `成交量放大至均量的${volRatio.toFixed(1)}倍，方向明确` })
    } else if (volRatio < 0.3) {
      signals.push({ indicator: '缩量', type: 'neutral', level: 'weak', description: `成交量极度萎缩至均量的${volRatio.toFixed(1)}倍，可能变盘` })
    }
  }
  
  // ===== DMI信号 =====
  if (curr.dmi) {
    const { diPlus, diMinus, adx, adxr } = curr.dmi
    if (diPlus && diMinus && adx) {
      // DI+上穿DI-
      if (diPlus > diMinus && prev.dmi?.diPlus <= prev.dmi?.diMinus) {
        signals.push({ indicator: 'DMI金叉', type: 'buy', level: 'medium', description: 'DI+上穿DI-，多头趋势形成' })
      } else if (diPlus < diMinus && prev.dmi?.diPlus >= prev.dmi?.diMinus) {
        signals.push({ indicator: 'DMI死叉', type: 'sell', level: 'medium', description: 'DI+下穿DI-，空头趋势形成' })
      }
      // ADX趋势强度
      if (adx > 25) {
        signals.push({ indicator: 'DMI趋势强', type: 'neutral', level: 'weak', description: `ADX=${adx.toFixed(1)}>25，趋势明显，适合顺势操作` })
      } else if (adx < 20) {
        signals.push({ indicator: 'DMI趋势弱', type: 'neutral', level: 'weak', description: `ADX=${adx.toFixed(1)}<20，趋势不明，震荡整理` })
      }
      // DI+ > DI- 多头
      if (diPlus > diMinus) {
        signals.push({ indicator: 'DMI多头', type: 'buy', level: 'weak', description: 'DI+ > DI-，多头占优' })
      } else {
        signals.push({ indicator: 'DMI空头', type: 'sell', level: 'weak', description: 'DI+ < DI-，空头占优' })
      }
    }
  }
  
  // ===== OBV能量潮信号 =====
  if (curr.obv && data.length > 10) {
    const prevObv = prev.obv
    if (curr.obv > prevObv) {
      signals.push({ indicator: 'OBV上涨', type: 'buy', level: 'weak', description: 'OBV上升，资金流入，看涨' })
    } else if (curr.obv < prevObv) {
      signals.push({ indicator: 'OBV下跌', type: 'sell', level: 'weak', description: 'OBV下降，资金流出，看跌' })
    }
  }
  
  // ===== 趋势强度综合评分 =====
  let buyScore = 0, sellScore = 0
  signals.forEach(s => {
    if (s.type === 'buy') buyScore += { strong: 3, medium: 2, weak: 1 }[s.level] || 0
    if (s.type === 'sell') sellScore += { strong: 3, medium: 2, weak: 1 }[s.level] || 0
  })
  
  // ===== 高级技术分析信号 =====
  if (data.length >= 60) {
    const ma60 = curr.ma60 || curr.ma20
    const ma120 = data.slice(-120).reduce((sum, d) => sum + (d.ma20 || d.close), 0) / Math.min(data.length, 120)
    
    // 均线偏离度分析
    if (ma60) {
      const bias5 = ((curr.close - curr.ma5) / curr.ma5 * 100)
      const bias10 = ((curr.close - curr.ma10) / curr.ma10 * 100)
      const bias20 = ((curr.close - curr.ma20) / curr.ma20 * 100)
      const bias60 = ((curr.close - ma60) / ma60 * 100)
      
      if (bias5 > 10) {
        signals.push({ indicator: 'BIAS5正偏离', type: 'sell', level: 'medium', description: `价格偏离5日均线${bias5.toFixed(1)}%，短期可能回调` })
      } else if (bias5 < -10) {
        signals.push({ indicator: 'BIAS5负偏离', type: 'buy', level: 'medium', description: `价格偏离5日均线${bias5.toFixed(1)}%，短期可能反弹` })
      }
      
      if (bias20 > 20) {
        signals.push({ indicator: 'BIAS20严重高估', type: 'sell', level: 'strong', description: `价格偏离20日均线${bias20.toFixed(1)}%，存在大幅回调风险` })
      } else if (bias20 < -20) {
        signals.push({ indicator: 'BIAS20严重低估', type: 'buy', level: 'strong', description: `价格偏离20日均线${bias20.toFixed(1)}%，存在大幅反弹机会` })
      }
    }
    
    // 均线收敛/发散分析
    const ma5Ma20Diff = Math.abs(curr.ma5 - curr.ma20) / curr.ma20 * 100
    const prevMa5Ma20Diff = Math.abs(prev.ma5 - prev.ma20) / prev.ma20 * 100
    if (ma5Ma20Diff < 2 && prevMa5Ma20Diff > 5) {
      signals.push({ indicator: '均线粘合', type: 'neutral', level: 'medium', description: '短期均线收敛粘合，可能选择突破方向' })
    } else if (ma5Ma20Diff > 15) {
      signals.push({ indicator: '均线发散', type: curr.ma5 > curr.ma20 ? 'buy' : 'sell', level: 'medium', description: '均线发散，趋势强劲' })
    }
    
    // 趋势延续信号
    const recent5 = data.slice(-5)
    const recent10 = data.slice(-10)
    const avgChange5 = recent5.reduce((sum, d) => sum + d.change, 0) / 5
    const avgChange10 = recent10.reduce((sum, d) => sum + d.change, 0) / 10
    
    if (avgChange5 > 3 && avgChange10 > 2) {
      signals.push({ indicator: '趋势延续(上涨)', type: 'buy', level: 'medium', description: `近期平均涨幅${avgChange5.toFixed(1)}%，上涨趋势延续` })
    } else if (avgChange5 < -3 && avgChange10 < -2) {
      signals.push({ indicator: '趋势延续(下跌)', type: 'sell', level: 'medium', description: `近期平均跌幅${Math.abs(avgChange5).toFixed(1)}%，下跌趋势延续` })
    }
    
    // 震荡整理信号
    const priceRange = (Math.max(...highs) - Math.min(...lows)) / Math.min(...lows) * 100
    if (priceRange < 10 && data.length > 30) {
      signals.push({ indicator: '窄幅震荡', type: 'neutral', level: 'weak', description: `振幅仅${priceRange.toFixed(1)}%，即将选择突破方向` })
    }
    
    // 支撑位分析
    const low20 = Math.min(...data.slice(-20).map(d => d.low))
    const low60 = Math.min(...data.slice(-60).map(d => d.low))
    if (curr.close - low20 < low20 * 0.03) {
      signals.push({ indicator: '触及20日低点', type: 'neutral', level: 'weak', description: `接近20日最低价${low20.toFixed(2)}，关注支撑` })
    }
    if (curr.close - low60 < low60 * 0.05) {
      signals.push({ indicator: '触及60日低点', type: 'buy', level: 'medium', description: `接近60日最低价${low60.toFixed(2)}，存在较强支撑` })
    }
    
    // 压力位分析
    const high20 = Math.max(...data.slice(-20).map(d => d.high))
    const high60 = Math.max(...data.slice(-60).map(d => d.high))
    if (high20 - curr.close < high20 * 0.03) {
      signals.push({ indicator: '触及20日高点', type: 'neutral', level: 'weak', description: `接近20日最高价${high20.toFixed(2)}，关注压力` })
    }
    if (high60 - curr.close < high60 * 0.05) {
      signals.push({ indicator: '触及60日高点', type: 'sell', level: 'medium', description: `接近60日最高价${high60.toFixed(2)}，存在较强压力` })
    }
  }
  
  // ===== 量价关系分析 =====
  if (curr.volume && data.length > 20) {
    const volData = data.slice(-20)
    const avgVol = volData.reduce((sum, d) => sum + d.volume, 0) / 20
    
    // 量价齐升/齐跌
    if (curr.volume > avgVol * 1.3 && curr.change > 0 && curr.close > prev.close) {
      signals.push({ indicator: '量价齐升', type: 'buy', level: 'medium', description: '成交量放大配合价格上涨，健康的上涨趋势' })
    } else if (curr.volume > avgVol * 1.3 && curr.change < 0 && curr.close < prev.close) {
      signals.push({ indicator: '量价齐跌', type: 'sell', level: 'medium', description: '成交量放大配合价格下跌，恐慌性下跌' })
    }
    
    // 放量滞涨/滞跌
    if (curr.volume > avgVol * 1.5 && Math.abs(curr.change) < 1) {
      signals.push({ indicator: '放量滞涨/滞跌', type: 'neutral', level: 'medium', description: '成交量放大但价格变动不大，可能反转' })
    }
    
    // 缩量回调/反弹
    if (curr.volume < avgVol * 0.5 && Math.abs(curr.change) < 2) {
      signals.push({ indicator: '缩量整理', type: 'neutral', level: 'weak', description: '成交量萎缩，观望情绪浓厚，等待方向' })
    }
  }
  
  // ===== 市场心理分析 =====
  if (data.length >= 10) {
    const upDays = data.slice(-10).filter(d => d.change > 0).length
    const downDays = data.slice(-10).filter(d => d.change < 0).length
    const upRate = upDays / 10 * 100
    
    if (upRate >= 80) {
      signals.push({ indicator: '市场过热', type: 'sell', level: 'medium', description: `10天内${upRate.toFixed(0)}%上涨，警惕回调` })
    } else if (upRate <= 20) {
      signals.push({ indicator: '市场过冷', type: 'buy', level: 'medium', description: `10天内仅${upRate.toFixed(0)}%上涨，存在反弹机会` })
    } else if (upRate >= 60) {
      signals.push({ indicator: '多头情绪', type: 'buy', level: 'weak', description: `多头情绪占优(${upRate.toFixed(0)}%)` })
    } else if (upRate <= 40) {
      signals.push({ indicator: '空头情绪', type: 'sell', level: 'weak', description: `空头情绪占优(${upRate.toFixed(0)}%)` })
    }
  }
  
  // 添加综合信号
  if (buyScore > sellScore + 2) {
    signals.unshift({ indicator: '综合信号', type: 'buy', level: 'strong', description: `买入信号强(得分${buyScore} vs ${sellScore})，建议关注` })
  } else if (sellScore > buyScore + 2) {
    signals.unshift({ indicator: '综合信号', type: 'sell', level: 'strong', description: `卖出信号强(得分${sellScore} vs ${buyScore})，注意风险` })
  } else if (buyScore > 0 || sellScore > 0) {
    signals.unshift({ indicator: '综合信号', type: 'neutral', level: 'weak', description: `多空平衡(买入${buyScore}分 vs 卖出${sellScore}分)，建议观望` })
  }
  
  return signals
}

// 生成分析报告
function generateAnalysisReport(data, signals = []) {
  if (!data || data.length < 20) return null
  
  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const prices = data.map(d => d.close)
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)
  const volumes = data.map(d => d.volume)
  
  // 计算趋势
  let trend = '震荡整理'
  let overallTrend = '震荡'
  if (latest.ma5 > latest.ma10 && latest.ma10 > latest.ma20) {
    trend = '上涨趋势'
    overallTrend = '强势上涨'
  } else if (latest.ma5 < latest.ma10 && latest.ma10 < latest.ma20) {
    trend = '下跌趋势'
    overallTrend = '弱势下跌'
  }
  
  // 计算支撑压力
  const support5 = latest.ma5 ? latest.ma5 * 0.95 : null
  const support10 = latest.ma10 ? latest.ma10 * 0.93 : null
  const support20 = latest.ma20 ? latest.ma20 * 0.90 : null
  const resistance5 = latest.ma5 ? latest.ma5 * 1.05 : null
  const resistance10 = latest.ma10 ? latest.ma10 * 1.07 : null
  const resistance20 = latest.ma20 ? latest.ma20 * 1.10 : null
  
  // 计算均线多头/空头排列天数
  let maGoldenDays = 0
  let maDeathDays = 0
  for (let i = Math.max(0, data.length - 20); i < data.length; i++) {
    if (data[i].ma5 > data[i].ma10 && data[i].ma10 > data[i].ma20) maGoldenDays++
    if (data[i].ma5 < data[i].ma10 && data[i].ma10 < data[i].ma20) maDeathDays++
  }
  
  // 计算波动率
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i])
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100
  
  // 计算成交量变化
  const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const volChange = ((latest.volume - avgVol20) / avgVol20 * 100)
  
  // 综合判断
  let summary = `【${currentStock.value?.name || '该股票'}技术分析报告】\n\n`
  summary += `📊 趋势判断：${trend}\n`
  
  // 均线分析
  summary += `\n📈 均线分析：\n`
  if (maGoldenDays >= 15) {
    summary += `  • 近20日均线多头排列天数：${maGoldenDays}天，持续强势\n`
  } else if (maDeathDays >= 15) {
    summary += `  • 近20日均线空头排列天数：${maDeathDays}天，持续弱势\n`
  } else {
    summary += `  • 均线暂无明确方向，处于震荡调整\n`
  }
  summary += `  • 5日均线：${latest.ma5?.toFixed(2)}\n`
  summary += `  • 10日均线：${latest.ma10?.toFixed(2)}\n`
  summary += `  • 20日均线：${latest.ma20?.toFixed(2)}\n`
  
  // RSI分析
  summary += `\n📉 RSI指标：${latest.rsi?.toFixed(1)}\n`
  if (latest.rsi > 80) {
    summary += `  • 严重超买，回调风险较大\n`
  } else if (latest.rsi > 70) {
    summary += `  • 处于超买区域，注意风险\n`
  } else if (latest.rsi < 20) {
    summary += `  • 严重超卖，反弹机会较大\n`
  } else if (latest.rsi < 30) {
    summary += `  • 处于超卖区域，存在反弹机会\n`
  } else {
    summary += `  • 处于中性区域\n`
  }
  
  // MACD分析
  summary += `\n📊 MACD指标：\n`
  if (latest.macd?.bar > 0) {
    summary += `  • 红柱放大，多头信号\n`
  } else if (latest.macd?.bar < 0) {
    summary += `  • 绿柱放大，空头信号\n`
  }
  if (latest.macd?.dif > latest.macd?.dea) {
    summary += `  • DIF > DEA，处于多头区域\n`
  } else {
    summary += `  • DIF < DEA，处于空头区域\n`
  }
  
  // KDJ分析
  if (latest.kdj) {
    summary += `\n📊 KDJ指标：K=${latest.kdj.k?.toFixed(1)}, D=${latest.kdj.d?.toFixed(1)}, J=${latest.kdj.j?.toFixed(1)}\n`
    if (latest.kdj.k > 80) {
      summary += `  • K值超买区，注意回调\n`
    } else if (latest.kdj.k < 20) {
      summary += `  • K值超卖区，关注反弹\n`
    }
  }
  
  // 布林带分析
  if (latest.boll) {
    const position = ((latest.close - latest.boll.lower) / (latest.boll.upper - latest.boll.lower) * 100).toFixed(1)
    summary += `\n📊 布林带：\n`
    summary += `  • 上轨：${latest.boll.upper?.toFixed(2)}\n`
    summary += `  • 中轨：${latest.boll.middle?.toFixed(2)}\n`
    summary += `  • 下轨：${latest.boll.lower?.toFixed(2)}\n`
    summary += `  • 当前位置：${position}%${position > 80 ? '(超买)' : position < 20 ? '(超卖)' : ''}\n`
  }
  
  // 成交量分析
  summary += `\n📊 成交量分析：\n`
  summary += `  • 当前成交量：${(latest.volume / 10000).toFixed(1)}万\n`
  summary += `  • 20日均量：${(avgVol20 / 10000).toFixed(1)}万\n`
  summary += `  • 量能变化：${volChange > 0 ? '+' : ''}${volChange.toFixed(1)}%\n`
  if (volChange > 50) {
    summary += `  • 成交量大幅放大，活跃度提升\n`
  } else if (volChange < -50) {
    summary += `  • 成交量大幅萎缩，观望情绪浓厚\n`
  }
  
  // 支撑压力
  summary += `\n🎯 支撑与压力：\n`
  if (support20) summary += `  • 20日均线支撑：${support20.toFixed(2)}\n`
  if (resistance20) summary += `  • 20日均线压力：${resistance20.toFixed(2)}\n`
  summary += `  • 当前价格：${latest.close?.toFixed(2)}\n`
  
  // 波动率
  summary += `\n📊 波动率：${volatility.toFixed(1)}%${volatility > 30 ? '(高波动)' : volatility > 15 ? '(中等)' : '(低波动)'}\n`
  
  // 风险评估
  summary += `\n⚠️ 风险评估：\n`
  let riskLevel = '中等'
  let riskFactors = []
  if (latest.rsi > 75 || latest.kdj?.k > 85) {
    riskFactors.push('RSI/KDJ超买')
    riskLevel = '较高'
  }
  if (volatility > 30) riskFactors.push('波动率较高')
  if (latest.close > resistance20) riskFactors.push('接近压力位')
  if (riskFactors.length === 0 && latest.rsi < 40 && volatility < 20) {
    riskLevel = '较低'
    riskFactors.push('RSI超卖+低波动')
  }
  summary += `  • 风险等级：${riskLevel}\n`
  if (riskFactors.length > 0) {
    summary += `  • 风险因素：${riskFactors.join('、')}\n`
  }
  
  // 操作建议
  summary += `\n💡 操作建议：\n`
  const buySignals = signals.filter(s => s.type === 'buy').length
  const sellSignals = signals.filter(s => s.type === 'sell').length
  
  if (buySignals > sellSignals + 2) {
    summary += `  • 多头信号占优，建议关注\n`
    summary += `  • 买入信号：${buySignals}个，卖出信号：${sellSignals}个\n`
  } else if (sellSignals > buySignals + 2) {
    summary += `  • 空头信号占优，建议谨慎\n`
    summary += `  • 买入信号：${buySignals}个，卖出信号：${sellSignals}个\n`
  } else {
    summary += `  • 多空平衡，建议观望\n`
    summary += `  • 买入信号：${buySignals}个，卖出信号：${sellSignals}个\n`
  }
  
  return {
    overallTrend,
    trend,
    support: support20?.toFixed(2),
    resistance: resistance20?.toFixed(2),
    volatility: volatility.toFixed(1),
    riskLevel,
    summary
  }
}

// 生成投资建议
function generateInvestmentAdvice(data, signals = []) {
  if (!data || data.length < 20) return null
  
  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  
  // 统计信号
  const buySignals = signals.filter(s => s.type === 'buy').length
  const sellSignals = signals.filter(s => s.type === 'sell').length
  const neutralSignals = signals.filter(s => s.type === 'neutral').length
  
  // 计算各项评分
  let score = 50 // 基础分
  
  // 均线评分
  let trendScore = 0
  if (latest.ma5 > latest.ma10 && latest.ma10 > latest.ma20) {
    trendScore += 30
  } else if (latest.ma5 < latest.ma10 && latest.ma10 < latest.ma20) {
    trendScore -= 30
  }
  score += trendScore
  
  // RSI评分
  let rsiScore = 0
  if (latest.rsi) {
    if (latest.rsi < 30) rsiScore += 20
    else if (latest.rsi > 70) rsiScore -= 20
    else if (latest.rsi > 50) rsiScore += 10
    else rsiScore -= 10
  }
  score += rsiScore
  
  // MACD评分
  let macdScore = 0
  if (latest.macd) {
    if (latest.macd.bar > 0 && latest.macd.dif > latest.macd.dea) macdScore += 20
    else if (latest.macd.bar < 0 && latest.macd.dif < latest.macd.dea) macdScore -= 20
  }
  score += macdScore
  
  // KDJ评分
  let kdjScore = 0
  if (latest.kdj) {
    if (latest.kdj.k < 20) kdjScore += 15
    else if (latest.kdj.k > 80) kdjScore -= 15
  }
  score += kdjScore
  
  // 成交量评分
  const avgVol20 = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20
  let volScore = 0
  if (latest.volume > avgVol20 * 1.3 && latest.change_percent > 0) volScore += 10
  else if (latest.volume > avgVol20 * 1.3 && latest.change_percent < 0) volScore -= 10
  score += volScore
  
  // 综合评分限制在0-100
  score = Math.max(0, Math.min(100, score))
  
  // 确定市场状态
  let marketStatus = '震荡'
  if (score >= 70) marketStatus = '多头'
  else if (score <= 30) marketStatus = '空头'
  
  // 风险等级
  let riskLevel = '中'
  if (score >= 60 || latest.rsi > 70 || latest.rsi < 30) riskLevel = '高'
  else if (score >= 40 && score <= 60) riskLevel = '中'
  else riskLevel = '低'
  
  // 趋势分析
  const trendAnalysis = [
    { label: '均线排列', status: latest.ma5 > latest.ma10 && latest.ma10 > latest.ma20 ? '有利' : latest.ma5 < latest.ma10 && latest.ma10 < latest.ma20 ? '不利' : '中性' },
    { label: '价格位置', status: latest.close > latest.ma20 ? '有利' : '不利' },
    { label: 'MACD动能', status: latest.macd?.bar > 0 ? '有利' : latest.macd?.bar < 0 ? '不利' : '中性' },
  ]
  
  // 动能分析
  const momentumAnalysis = [
    { label: 'RSI强度', status: latest.rsi > 50 ? '有利' : latest.rsi ? '不利' : '中性' },
    { label: 'KDJ位置', status: latest.kdj?.k < 30 ? '有利' : latest.kdj?.k > 70 ? '不利' : '中性' },
    { label: '成交量能', status: latest.volume > avgVol20 ? '有利' : '不利' },
  ]
  
  // 操作建议
  let action = { title: '', description: '', type: 'warning', position: '', takeProfit: '', stopLoss: '' }
  
  if (score >= 70) {
    action = {
      title: '强烈建议买入',
      description: '多项技术指标显示积极信号，建议把握机会适当建仓',
      type: 'success',
      position: '30%-50%',
      takeProfit: (latest.close * 1.15).toFixed(2) + ' (涨幅15%)',
      stopLoss: (latest.close * 0.93).toFixed(2) + ' (跌幅7%)'
    }
  } else if (score >= 50) {
    action = {
      title: '建议关注',
      description: '技术面偏多，但需等待更明确的信号',
      type: 'warning',
      position: '20%-30%',
      takeProfit: (latest.close * 1.10).toFixed(2) + ' (涨幅10%)',
      stopLoss: (latest.close * 0.95).toFixed(2) + ' (跌幅5%)'
    }
  } else if (score >= 30) {
    action = {
      title: '建议观望',
      description: '技术面偏弱，建议保持谨慎，等待机会',
      type: 'warning',
      position: '10%-20%',
      takeProfit: (latest.close * 1.05).toFixed(2) + ' (涨幅5%)',
      stopLoss: (latest.close * 0.97).toFixed(2) + ' (跌幅3%)'
    }
  } else {
    action = {
      title: '不建议买入',
      description: '技术面较弱，风险较大，建议回避',
      type: 'error',
      position: '0%-10%',
      takeProfit: '暂不推荐',
      stopLoss: (latest.close * 0.95).toFixed(2) + ' (跌幅5%)'
    }
  }
  
  // 市场状态描述
  const marketDesc = score >= 70 ? '多项技术指标向好，市场处于多头趋势' : 
                     score >= 50 ? '技术面偏多，但存在不确定性' :
                     score >= 30 ? '技术面偏弱，建议保持谨慎' : '技术指标弱势明显，建议回避'
  
  // 风险描述
  const riskDesc = riskLevel === '高' ? '多项指标处于极端位置，波动较大' : 
                  riskLevel === '中' ? '市场处于震荡整理阶段' : '技术面平稳，风险较小'
  
  return {
    overallScore: score,
    scores: { trendScore, rsiScore, macdScore, kdjScore, volScore },
    marketStatus,
    marketDesc,
    riskLevel,
    riskDesc,
    signalStats: { buy: buySignals, sell: sellSignals, neutral: neutralSignals },
    trendAnalysis,
    momentumAnalysis,
    action
  }
}

// 生成自定义策略解读
function generateCustomStrategyAnalysis(data) {
  if (!data || data.length < 20) return { signals: [], conclusion: null }
  
  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const signals = []
  
  // 1. 均线系统分析
  const maSignal = analyzeMA(latest, prev, data)
  signals.push(maSignal)
  
  // 2. MACD指标分析
  const macdSignal = analyzeMACD(latest, prev, data)
  signals.push(macdSignal)
  
  // 3. 量能指标分析
  const volSignal = analyzeVolume(data)
  signals.push(volSignal)
  
  // 4. RSI指标分析
  const rsiSignal = analyzeRSI(latest, data)
  signals.push(rsiSignal)
  
  // 5. 布林带指标分析
  const bollSignal = analyzeBollinger(latest, data)
  signals.push(bollSignal)
  
  // 综合判断 - 加入信号强度权重
  let bullScore = 0, bearScore = 0
  signals.forEach(s => {
    if (s.status === 'bull') {
      bullScore += s.level === 'strong' ? 3 : s.level === 'medium' ? 2 : 1
    } else if (s.status === 'bear') {
      bearScore += s.level === 'strong' ? 3 : s.level === 'medium' ? 2 : 1
    }
  })
  
  const totalScore = bullScore + bearScore
  const maxScore = signals.length * 3
  
  let conclusion = null
  if (bullScore >= 10 || (bullScore >= 6 && bearScore <= 1)) {
    conclusion = {
      title: '✅ 主升浪信号强烈',
      desc: `综合得分 ${bullScore} vs ${bearScore}，多项指标呈现强势上涨特征，股价处于主升浪中，建议持股待涨或逢低买入。`,
      type: 'success'
    }
  } else if (bullScore >= 5 && bearScore <= 2) {
    conclusion = {
      title: '📈 上涨趋势健康',
      desc: `综合得分 ${bullScore} vs ${bearScore}，上涨信号占优，趋势健康，建议继续持有。`,
      type: 'success'
    }
  } else if (bullScore <= 2 && bearScore >= 6) {
    conclusion = {
      title: '⚠️ 离场信号明显',
      desc: `综合得分 ${bullScore} vs ${bearScore}，多项指标出现离场警惕信号，股价可能进入调整，建议减仓或离场观望。`,
      type: 'error'
    }
  } else if (bearScore > bullScore + 2) {
    conclusion = {
      title: '⚠️ 注意风险',
      desc: `综合得分 ${bullScore} vs ${bearScore}，下跌信号占优，建议谨慎操作，适当减仓。`,
      type: 'warning'
    }
  } else {
    conclusion = {
      title: '➖ 震荡整理',
      desc: `综合得分 ${bullScore} vs ${bearScore}，多空力量相对平衡，股价处于震荡整理阶段，建议观望或轻仓操作。`,
      type: 'warning'
    }
  }
  
  return { signals, conclusion }
}

// 均线系统分析 - 增加连续多头天数判断
function analyzeMA(latest, prev, data) {
  const { ma5, ma10, ma20, ma60, close } = latest
  const prevMa5 = prev.ma5, prevMa10 = prev.ma10, prevMa20 = prev.ma20
  
  let status = 'neutral'
  let level = 'weak'
  let current = '均线震荡整理'
  let signal = ''
  
  // 计算连续多头排列天数
  let bullDays = 0
  for (let i = data.length - 1; i >= 0; i--) {
    const d = data[i]
    if (d.ma5 > d.ma10 && d.ma10 > d.ma20 && d.ma20 > (d.ma60 || d.ma20)) {
      bullDays++
    } else {
      break
    }
  }
  
  // 计算连续空头排列天数
  let bearDays = 0
  for (let i = data.length - 1; i >= 0; i--) {
    const d = data[i]
    if (d.ma5 < d.ma10 && d.ma10 < d.ma20) {
      bearDays++
    } else {
      break
    }
  }
  
  // 判断均线多头排列
  const isBullish = ma5 > ma10 && ma10 > ma20 && ma20 > ma60
  // 判断短期均线向上
  const maRising = ma5 > prevMa5 && ma10 > prevMa10 && ma20 > prevMa20
  // 判断价格回踩均线后反弹
  const nearMA5 = Math.abs(close - ma5) / ma5 < 0.03
  // 价格跌破20日均线
  const belowMA20 = close < ma20
  
  if (isBullish && maRising) {
    if (bullDays >= 5) {
      status = 'bull'
      level = 'strong'
      current = `均线多头排列连续${bullDays}天，趋势强劲`
      signal = '连续5天以上多头排列，主升浪确认信号强烈'
    } else if (bullDays >= 3) {
      status = 'bull'
      level = 'medium'
      current = `均线多头排列连续${bullDays}天，趋势健康`
      signal = '短期均线持续向上，多头排列健康'
    } else {
      status = 'bull'
      level = 'weak'
      current = '均线多头排列初期'
      signal = '均线形成多头排列，但持续时间较短'
    }
  } else if (bearDays >= 5) {
    status = 'bear'
    level = 'strong'
    current = `均线空头排列连续${bearDays}天，趋势较弱`
    signal = '连续5天以上空头排列，离场信号强烈'
  } else if (bearDays >= 3) {
    status = 'bear'
    level = 'medium'
    current = `均线空头排列连续${bearDays}天`
    signal = '短期均线持续向下，注意风险'
  } else if (belowMA20 && close < prev.close) {
    status = 'bear'
    level = 'medium'
    current = '价格跌破20日均线'
    signal = '价格跌破20日均线且无法快速收回，建议减仓'
  }
  
  return { name: '均线系统', status, level, current, signal }
}

// MACD指标分析 - 增加红柱连续放大判断
function analyzeMACD(latest, prev, data) {
  const { macd } = latest
  const prevMacd = prev.macd
  
  let status = 'neutral'
  let level = 'weak'
  let current = 'MACD震荡整理'
  let signal = ''
  
  if (!macd) return { name: 'MACD指标', status: 'neutral', level: 'weak', current: '数据不足', signal: '' }
  
  const { dif, dea, bar } = macd
  const isAboveZero = dif > 0 && dea > 0
  const isBelowZero = dif < 0 && dea < 0
  
  // 计算红柱连续放大天数
  let bullishBars = 0
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].macd?.bar > 0) {
      bullishBars++
    } else {
      break
    }
  }
  
  // 计算绿柱连续放大天数
  let bearishBars = 0
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].macd?.bar < 0) {
      bearishBars++
    } else {
      break
    }
  }
  
  // 主升浪信号 - 红柱连续放大
  if (isAboveZero && dif > dea && bar > 0 && bullishBars >= 3) {
    status = 'bull'
    level = bullishBars >= 5 ? 'strong' : 'medium'
    current = `MACD零轴上方，红柱连续${bullishBars}天放大`
    if (bullishBars >= 5) {
      signal = '红柱连续5天以上放大，MACD远离零轴，主升浪特征明显'
    } else {
      signal = '红柱持续放大，多头动能充足'
    }
  } else if (isAboveZero && dif > dea && bar > 0) {
    status = 'bull'
    level = 'weak'
    current = 'MACD零轴上方金叉'
    signal = 'MACD形成金叉，短期看涨'
  }
  // 离场信号 - 绿柱连续放大或死叉
  else if (isBelowZero && dif < dea && bearishBars >= 3) {
    status = 'bear'
    level = bearishBars >= 5 ? 'strong' : 'medium'
    current = `MACD零轴下方，绿柱连续${bearishBars}天放大`
    if (bearishBars >= 5) {
      signal = '绿柱连续5天以上放大，趋势转弱明显'
    } else {
      signal = '绿柱持续放大，空头动能增强'
    }
  } else if (isBelowZero) {
    status = 'bear'
    level = 'medium'
    current = 'MACD运行在零轴下方'
    signal = 'MACD在零轴下方运行，趋势偏弱'
  } else if (dif < dea && prevMacd?.dif > prevMacd?.dea) {
    status = 'bear'
    level = 'medium'
    current = 'MACD高位死叉'
    signal = 'MACD形成死叉，警惕回调风险'
  } else if (bar < 0 && isAboveZero) {
    status = 'bear'
    level = 'weak'
    current = 'MACD红柱缩短'
    signal = '红柱开始缩短，短线可能调整'
  }
  
  return { name: 'MACD指标', status, level, current, signal }
}

// 量能指标分析 - 增加级别判断
function analyzeVolume(data) {
  if (data.length < 20) return { name: '量能指标', status: 'neutral', level: 'weak', current: '数据不足', signal: '' }
  
  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const avgVol20 = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20
  const volRatio = latest.volume / avgVol20
  
  // 计算上涨和回调阶段的成交量
  const upVolumes = data.slice(-10).filter((d, i) => i < 5 && d.change > 0).reduce((sum, d) => sum + d.volume, 0)
  const downVolumes = data.slice(-10).filter((d, i) => i >= 5 && d.change < 0).reduce((sum, d) => sum + d.volume, 0)
  const upCount = data.slice(-10).filter((d, i) => i < 5 && d.change > 0).length
  const downCount = data.slice(-10).filter((d, i) => i >= 5 && d.change < 0).length
  
  let status = 'neutral'
  let level = 'weak'
  let current = '成交量维持常态'
  let signal = ''
  
  // 主升浪：价涨量增、价跌量缩
  if (latest.change > 0 && volRatio > 1.5 && upVolumes > downVolumes * 1.5 && upCount >= downCount) {
    status = 'bull'
    level = 'strong'
    current = '价涨量增，量价配合健康'
    signal = '成交量放大1.5倍以上，上涨波段成交量远超回调波段，主升浪健康特征明显'
  } else if (latest.change > 0 && volRatio > 1.3 && upVolumes > downVolumes && upCount >= downCount) {
    status = 'bull'
    level = 'medium'
    current = '价涨量增，量价配合较好'
    signal = '上涨波段成交量大于回调波段，量价配合健康'
  } else if (latest.change > 0 && volRatio > 1.1) {
    status = 'bull'
    level = 'weak'
    current = '成交量温和放大'
    signal = '成交量略有放大，短线偏多'
  }
  // 离场：价格创新高但成交量萎缩
  else if (volRatio < 0.5 && latest.change > 0 && latest.close > data[data.length - 5].high) {
    status = 'bear'
    level = 'strong'
    current = '放量滞涨，量价严重背离'
    signal = '价格创新高但成交量萎缩50%以上，量价严重背离，强烈警惕回调'
  } else if (volRatio < 0.7 && latest.change > 0 && latest.close > data[data.length - 5].high) {
    status = 'bear'
    level = 'medium'
    current = '放量滞涨，量价背离'
    signal = '价格创新高但成交量萎缩，出现放量滞涨信号，警惕回调'
  } else if (volRatio < 0.5) {
    status = 'neutral'
    level = 'weak'
    current = '成交量极度萎缩'
    signal = '成交量极度萎缩，可能面临方向选择'
  } else if (volRatio < 0.7) {
    status = 'neutral'
    level = 'weak'
    current = '成交量萎缩'
    signal = '成交量有所萎缩，观望为主'
  }
  
  return { name: '量能指标', status, level, current, signal }
}

// RSI指标分析 - 增加级别和多日钝化判断
function analyzeRSI(latest, data) {
  const { rsi } = latest
  
  let status = 'neutral'
  let level = 'weak'
  let current = 'RSI运行在中性区域'
  let signal = ''
  
  if (!rsi) return { name: 'RSI指标', status: 'neutral', level: 'weak', current: '数据不足', signal: '' }
  
  // 计算RSI在超买区连续天数
  let overboughtDays = 0
  let oversoldDays = 0
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].rsi > 70) {
      overboughtDays++
    } else {
      break
    }
  }
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].rsi < 30) {
      oversoldDays++
    } else {
      break
    }
  }
  
  // 主升浪：RSI在50以上强势区，60-80区间波动
  if (rsi > 50 && rsi < 70 && overboughtDays === 0) {
    status = 'bull'
    level = 'medium'
    current = `RSI在${rsi.toFixed(1)}强势区运行`
    signal = '运行在50以上强势区，趋势健康'
  } else if (rsi > 50 && rsi < 70) {
    status = 'bull'
    level = 'weak'
    current = `RSI在${rsi.toFixed(1)}偏强区域`
    signal = 'RSI偏强，但需关注是否进入超买区'
  }
  // 离场：RSI进入80以上超买区后快速回落
  else if (overboughtDays >= 5) {
    status = 'bear'
    level = 'strong'
    current = `RSI在${rsi.toFixed(1)}超买区连续${overboughtDays}天`
    signal = 'RSI在70以上超买区连续5天以上，高度警惕回调风险'
  } else if (rsi > 80) {
    status = 'bear'
    level = 'medium'
    current = `RSI在${rsi.toFixed(1)}严重超买`
    signal = '进入80以上超买区，强烈警惕回调风险'
  } else if (rsi > 70) {
    status = 'bear'
    level = 'weak'
    current = `RSI在${rsi.toFixed(1)}超买区`
    signal = 'RSI进入70以上超买区，注意回调风险'
  } else if (oversoldDays >= 3) {
    status = 'bull'
    level = 'medium'
    current = `RSI在${rsi.toFixed(1)}超卖区连续${oversoldDays}天`
    signal = 'RSI在30以下超卖区连续3天，存在较强反弹机会'
  } else if (rsi < 30) {
    status = 'bull'
    level = 'weak'
    current = `RSI在${rsi.toFixed(1)}超卖区`
    signal = 'RSI进入30以下超卖区，存在反弹机会'
  }
  
  return { name: 'RSI指标', status, level, current, signal }
}

// 布林带指标分析 - 增加收口迹象和中轨方向判断
function analyzeBollinger(latest, data) {
  const { close, boll } = latest
  
  if (!boll) return { name: '布林带', status: 'neutral', level: 'weak', current: '数据不足', signal: '' }
  
  const { upper, middle, lower } = boll
  const position = ((close - lower) / (upper - lower)) * 100
  
  // 计算布林带宽度变化
  const prevBoll = data[data.length - 2]?.boll
  const prevWidth = prevBoll ? prevBoll.upper - prevBoll.lower : 0
  const currentWidth = upper - lower
  const widthChange = prevWidth > 0 ? (currentWidth - prevWidth) / prevWidth : 0
  
  // 计算中轨方向
  const prevMiddle = prevBoll?.middle || middle
  const middleRising = middle > prevMiddle
  const middleFalling = middle < prevMiddle
  
  let status = 'neutral'
  let level = 'weak'
  let current = '价格在布林带中轨附近运行'
  let signal = ''
  
  // 主升浪：价格沿上轨上行，布林带开口扩大，中轨向上
  if (close > middle && position > 60 && position < 90 && widthChange > 0 && middleRising) {
    status = 'bull'
    level = 'strong'
    current = '价格沿布林上轨上行，开口扩大，中轨向上'
    signal = '价格沿上轨上行，布林带开口持续扩大，中轨向上，强势特征明显'
  } else if (close > middle && position > 60 && position < 90) {
    status = 'bull'
    level = 'medium'
    current = '价格沿布林上轨上行'
    signal = '价格沿上轨上行，趋势偏多'
  } else if (close > middle && position > 50) {
    status = 'bull'
    level = 'weak'
    current = '价格在布林中上轨之间运行'
    signal = '价格运行在中上轨之间，短线偏多'
  }
  // 离场：价格跌破布林带上轨，收口迹象，中轨拐头向下
  else if (position > 95 && widthChange < -0.1) {
    status = 'bear'
    level = 'strong'
    current = '价格触及布林上轨后回落，布林带收口，中轨拐头向下'
    signal = '价格触及上轨后回落，布林带快速收口，中轨拐头向下，强烈警惕回调'
  } else if (position > 90) {
    status = 'bear'
    level = 'medium'
    current = '价格触及布林上轨'
    signal = '价格触及布林上轨，警惕回调风险'
  } else if (widthChange < -0.15 && middleFalling) {
    status = 'bear'
    level = 'medium'
    current = '布林带明显收口，中轨向下'
    signal = '布林带快速收口，中轨向下，趋势可能反转'
  } else if (position < 20 && widthChange < 0) {
    status = 'bull'
    level = 'weak'
    current = '价格触及布林下轨，布林带收窄'
    signal = '价格触及布林下轨，可能存在反弹机会'
  } else if (position < 20) {
    status = 'neutral'
    level = 'weak'
    current = '价格触及布林下轨'
    signal = '价格触及布林下轨，可能存在反弹机会'
  }
  
  return { name: '布林带', status, level, current, signal }
}

// 渲染图表
const renderCharts = () => {
  if (!currentStock.value?.data) return
  
  const data = currentStock.value.data
  const dates = data.map(d => d.date)
  
  // 销毁旧图表
  Object.values(charts).forEach(chart => chart?.dispose())
  
  // K线图/收盘线图
  if (klineChartRef.value) {
    charts.kline = echarts.init(klineChartRef.value)
    
    // 根据图表类型决定显示K线还是收盘线
    const isKline = chartType.value === 'kline'
    
    const seriesList = []
    
    if (isKline) {
      // K线图
      seriesList.push({
        name: 'K线',
        type: 'candlestick',
        data: data.map(d => [d.open, d.close, d.low, d.high]),
        itemStyle: { color: '#f5222d', color0: '#52c41a' }
      })
    } else {
      // 收盘线图
      seriesList.push({
        name: '收盘价',
        type: 'line',
        data: data.map(d => d.close),
        smooth: true,
        lineStyle: { width: 2, color: '#1890ff' },
        symbol: 'none',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
            ]
          }
        }
      })
    }
    
    // 添加均线和布林带
    if (selectedIndicators.value.includes('ma')) {
      seriesList.push({ name: 'MA5', type: 'line', data: data.map(d => d.ma5), smooth: true, lineStyle: { width: 1, color: '#f5222d' }, symbol: 'none'})
      seriesList.push({ name: 'MA10', type: 'line', data: data.map(d => d.ma10), smooth: true, lineStyle: { width: 1, color: '#faad14' }, symbol: 'none'})
      seriesList.push({ name: 'MA20', type: 'line', data: data.map(d => d.ma20), smooth: true, lineStyle: { width: 1, color: '#52c41a' }, symbol: 'none'})
      seriesList.push({ name: 'MA60', type: 'line', data: data.map(d => d.ma60), smooth: true, lineStyle: { width: 1, color: '#722ed1' }, symbol: 'none'})
    }
    if (selectedIndicators.value.includes('boll')) {
      seriesList.push({ name: 'BOLL_UPPER', type: 'line', data: data.map(d => d.boll?.upper), smooth: true, lineStyle: { width: 1, color: '#1890ff', type: 'dashed' }, symbol: 'none'})
      seriesList.push({ name: 'BOLL_MID', type: 'line', data: data.map(d => d.boll?.middle), smooth: true, lineStyle: { width: 1, color: '#1890ff' }, symbol: 'none'})
      seriesList.push({ name: 'BOLL_LOWER', type: 'line', data: data.map(d => d.boll?.lower), smooth: true, lineStyle: { width: 1, color: '#1890ff', type: 'dashed' }, symbol: 'none'})
    }
    
    const legendData = isKline 
      ? ['K线', 'MA5', 'MA10', 'MA20', 'MA60', 'BOLL_UPPER', 'BOLL_MID', 'BOLL_LOWER'].filter(n => seriesList.some(s => s.name === n))
      : ['收盘价', 'MA5', 'MA10', 'MA20', 'MA60', 'BOLL_UPPER', 'BOLL_MID', 'BOLL_LOWER'].filter(n => seriesList.some(s => s.name === n))
    
    const klineOption = {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'cross' },
        formatter: (params) => {
          if (!params || params.length === 0) return ''
          const date = params[0].axisValue
          let html = `<b>${date}</b><br/>`
          
          // 遍历所有指标数据
          params.forEach(p => {
            if (p.value === undefined || p.value === null) return
            let val = Number(p.value).toFixed(2)
            let name = p.seriesName
            // K线字段名改为中文
            if (name === 'K线') {
              name = 'K线'
              const [o, c, l, h] = p.data
              html += `开盘: ${Number(o).toFixed(2)}<br/>`
              html += `收盘: ${Number(c).toFixed(2)}<br/>`
              html += `最低: ${Number(l).toFixed(2)}<br/>`
              html += `最高: ${Number(h).toFixed(2)}<br/>`
              return
            }
            // 其他指标直接显示
            html += `${name}: ${val}<br/>`
          })
          return html
        }
      },
      legend: { data: legendData, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%' },
      xAxis: { 
        type: 'category', 
        data: dates, 
        scale: true,
        axisLabel: {
          show: true,
          interval: Math.floor(dates.length / 8),
          formatter: (value) => value ? value.substring(5) : ''
        },
        axisTick: { show: true }
      },
      yAxis: { 
        scale: true, 
        splitArea: { show: true },
        axisLabel: {
          formatter: '{value}'
        }
      },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 0 }],
      series: seriesList
    }
    charts.kline.setOption(klineOption)
  }
  
  // MACD图
  if (macdChartRef.value) {
    charts.macd = echarts.init(macdChartRef.value)
    charts.macd.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['DIF', 'DEA', 'MACD'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { 
        type: 'category', 
        data: dates, 
        show: false 
      },
      yAxis: { 
        scale: true,
        axisLabel: { formatter: '{value}' }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'DIF', type: 'line', data: data.map(d => d.macd?.dif), lineStyle: { color: '#1890ff' }, symbol: 'none' },
        { name: 'DEA', type: 'line', data: data.map(d => d.macd?.dea), lineStyle: { color: '#f5222d' }, symbol: 'none' },
        { name: 'MACD', type: 'bar', data: data.map(d => d.macd?.bar), itemStyle: { color: (p) => p.value >= 0 ? '#f5222d' : '#52c41a' }}
      ]
    })
  }
  
  // RSI图
  if (rsiChartRef.value) {
    charts.rsi = echarts.init(rsiChartRef.value)
    charts.rsi.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['RSI'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        min: 0, 
        max: 100,
        axisLabel: { formatter: '{value}' }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'RSI', type: 'line', data: data.map(d => d.rsi), lineStyle: { color: '#eb2f96' }, symbol: 'none' },
        { name: '超买线', type: 'line', data: data.map(() => 70), lineStyle: { color: '#f5222d', type: 'dashed', width: 1 }, symbol: 'none' },
        { name: '超卖线', type: 'line', data: data.map(() => 30), lineStyle: { color: '#52c41a', type: 'dashed', width: 1 }, symbol: 'none' },
        { name: '中轴', type: 'line', data: data.map(() => 50), lineStyle: { color: '#999', type: 'dashed', width: 1 }, symbol: 'none' }
      ]
    })
  }
  
  // KDJ图
  if (kdjChartRef.value) {
    charts.kdj = echarts.init(kdjChartRef.value)
    charts.kdj.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['K', 'D', 'J'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        min: 0, 
        max: 100,
        axisLabel: { formatter: '{value}' }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'K', type: 'line', data: data.map(d => d.kdj?.k), lineStyle: { color: '#1890ff' }, symbol: 'none' },
        { name: 'D', type: 'line', data: data.map(d => d.kdj?.d), lineStyle: { color: '#faad14' }, symbol: 'none' },
        { name: 'J', type: 'line', data: data.map(d => d.kdj?.j), lineStyle: { color: '#eb2f96' }, symbol: 'none' },
        { name: '超买线', type: 'line', data: data.map(() => 80), lineStyle: { color: '#f5222d', type: 'dashed', width: 1 }, symbol: 'none' },
        { name: '超卖线', type: 'line', data: data.map(() => 20), lineStyle: { color: '#52c41a', type: 'dashed', width: 1 }, symbol: 'none' }
      ]
    })
  }
  
  // 成交量图
  if (volumeChartRef.value) {
    charts.volume = echarts.init(volumeChartRef.value)
    const volData = data.map(d => ({
      value: d.volume,
      itemStyle: {
        color: d.close >= d.open ? '#f5222d' : '#52c41a'
      }
    }))
    charts.volume.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['成交量'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        scale: true,
        axisLabel: { 
          formatter: (value) => {
            if (value >= 10000) return (value / 10000).toFixed(0) + '万'
            return value
          }
        }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: '成交量', type: 'bar', data: volData }
      ]
    })
  }
  
  // DMI指标图
  if (dmiChartRef.value) {
    charts.dmi = echarts.init(dmiChartRef.value)
    charts.dmi.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['+DI', '-DI', 'ADX'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        scale: true,
        axisLabel: { formatter: '{value}' }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: '+DI', type: 'line', data: data.map(d => d.dmi?.plus_di), lineStyle: { color: '#1890ff' }, symbol: 'none' },
        { name: '-DI', type: 'line', data: data.map(d => d.dmi?.minus_di), lineStyle: { color: '#f5222d' }, symbol: 'none' },
        { name: 'ADX', type: 'line', data: data.map(d => d.dmi?.adx), lineStyle: { color: '#52c41a' }, symbol: 'none' }
      ]
    })
  }
  
  // OBV能量潮图
  if (obvChartRef.value) {
    charts.obv = echarts.init(obvChartRef.value)
    charts.obv.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['OBV'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        scale: true,
        axisLabel: { 
          formatter: (value) => {
            if (Math.abs(value) >= 10000) return (value / 10000).toFixed(0) + '万'
            return value
          }
        }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'OBV', type: 'line', data: data.map(d => d.obv), lineStyle: { color: '#722ed1' }, symbol: 'none' }
      ]
    })
  }
  
  // 图表响应式resize
  const resizeCharts = () => {
    // 主图K线
    if (klineChartRef.value) {
      const klineWidth = klineChartRef.value.parentElement?.clientWidth || 
        document.querySelector('.chart-card')?.clientWidth || 800
      if (charts.kline) {
        charts.kline.resize({ width: klineWidth - 32 })
      }
    }
    
    // 子图表 - 分别获取各自的容器宽度
    const chartRefs = {
      macd: macdChartRef.value,
      rsi: rsiChartRef.value,
      kdj: kdjChartRef.value,
      volume: volumeChartRef.value,
      dmi: dmiChartRef.value,
      obv: obvChartRef.value
    }
    
    Object.entries(chartRefs).forEach(([name, ref]) => {
      if (ref?.parentElement) {
        const width = ref.parentElement.clientWidth - 32
        if (charts[name]) {
          charts[name].resize({ width })
        }
      }
    })
  }

  // 防抖函数
  let resizeTimer = null
  const handleResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      resizeCharts()
    }, 100)
  }

  window.addEventListener('resize', handleResize)

  // 页面加载后初始化图表尺寸
  setTimeout(resizeCharts, 500)
}

// 时间范围变化
const onTimeRangeChange = () => {
  onSearch()
}

// 图表类型变化
const onChartTypeChange = () => {
  nextTick(() => renderCharts())
}

// 指标选择变化
const onIndicatorChange = () => {
  nextTick(() => renderCharts())
}

// 刷新数据
const refreshData = () => {
  onSearch()
}

// 工具函数
const getPriceClass = (change) => {
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return ''
}

const getRSIClass = (rsi) => {
  if (rsi > 70) return 'overbought'
  if (rsi < 30) return 'oversold'
  return ''
}

const getKDJClass = (k) => {
  if (k > 80) return 'overbought'
  if (k < 20) return 'oversold'
  return ''
}

const formatVolume = (vol) => {
  if (!vol) return '0'
  if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿'
  if (vol >= 10000) return (vol / 10000).toFixed(2) + '万'
  return vol.toString()
}

const formatAmount = (amount) => {
  if (!amount) return '0'
  if (amount >= 100000000) return (amount / 100000000).toFixed(2) + '亿'
  if (amount >= 10000) return (amount / 10000).toFixed(2) + '万'
  return amount.toString()
}
</script>

<style scoped>
.stock-analysis-container {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;
}

.pool-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.pool-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px 8px 0 0;
}

.pool-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.stock-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  padding: 8px 0;
}

.pool-item {
  cursor: pointer;
  margin: 2px;
  transition: all 0.3s;
  border-radius: 4px;
}

.pool-item:hover {
  opacity: 0.8;
  transform: translateY(-2px);
}

.no-data {
  color: #999;
  font-size: 12px;
  padding: 8px;
}

.search-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.search-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 8px 8px 0 0;
}

.search-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.stock-info {
  margin-top: 8px;
}

/* 多宫格卡片样式 */
.stock-card {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
}

.stock-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stock-card .card-icon {
  font-size: 24px;
  margin-right: 12px;
  flex-shrink: 0;
}

.stock-card .card-content {
  flex: 1;
  min-width: 0;
}

.stock-card .card-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.stock-card .card-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-card .card-value.name {
  color: #1890ff;
  font-size: 18px;
}

.stock-card .card-value.price {
  font-size: 20px;
  font-weight: 700;
}

.stock-card .card-value.up {
  color: #f5222d;
}

.stock-card .card-value.down {
  color: #52c41a;
}

.stock-card .card-value.time {
  font-size: 12px;
  color: #666;
}

/* 名称卡片 */
.stock-card.name-card {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-color: #91d5ff;
}

/* 价格卡片 */
.stock-card.price-card {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border-color: #ffd591;
}

/* 涨跌幅卡片 */
.stock-card.up-card {
  background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
  border-color: #ffa39e;
}

.stock-card.down-card {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border-color: #b7eb8f;
}

/* 最高价卡片 */
.stock-card:has(.card-icon:contains('⬆️')) {
  background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
  border-color: #ffa39e;
}

/* 最低价卡片 */
.stock-card:has(.card-icon:contains('⬇️')) {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border-color: #b7eb8f;
}

.analysis-report-card {
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f0f5ff 0%, #fff7e6 100%);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.analysis-report-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px 8px 0 0;
}

.analysis-report-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 核心指标展示 */
.core-indicators {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .core-indicators {
    grid-template-columns: repeat(2, 1fr);
  }
}

.core-item {
  background: white;
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.3s;
  border: 2px solid transparent;
}

.core-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
}

.core-item.trend {
  border-color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #fff 100%);
}

.core-item.support {
  border-color: #52c41a;
  background: linear-gradient(135deg, #f6ffed 0%, #fff 100%);
}

.core-item.resistance {
  border-color: #f5222d;
  background: linear-gradient(135deg, #fff1f0 0%, #fff 100%);
}

.core-item.volatility {
  border-color: #faad14;
  background: linear-gradient(135deg, #fffbe6 0%, #fff 100%);
}

.core-item.risk {
  border-color: #722ed1;
  background: linear-gradient(135deg, #f9f0ff 0%, #fff 100%);
}

.core-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.core-content {
  display: flex;
  flex-direction: column;
}

.core-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.core-value {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

/* 快速指标 */
.quick-indicators {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e0e0e0;
}

.quick-item {
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.quick-item .label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.quick-item .value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.quick-item .value.up {
  color: #f5222d;
}

.quick-item .value.down {
  color: #52c41a;
}

.analysis-header .title {
  font-size: 18px;
  font-weight: bold;
  color: #1890ff;
}

.analysis-summary .summary-item {
  text-align: center;
  padding: 12px;
  background: rgba(255,255,255,0.9);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.3s;
}

.analysis-summary .summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.analysis-summary .summary-item .label {
  display: block;
  font-size: 14px;
  color: #888;
  margin-bottom: 4px;
}

.analysis-summary .summary-item .value {
  display: block;
  font-size: 18px;
  font-weight: bold;
}

.analysis-summary .summary-item .value.support {
  color: #52c41a;
}

.analysis-summary .summary-item .value.resistance {
  color: #f5222d;
}

.indicator-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.indicator-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 8px 8px 0 0;
}

.indicator-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.key-indicators {
  margin-top: 16px;
}

.indicator-box {
  text-align: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  transition: all 0.3s;
}

.indicator-box:hover {
  background: #e6f7ff;
  transform: scale(1.02);
}

.indicator-box .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.indicator-box .value {
  display: block;
  font-size: 16px;
  font-weight: bold;
}

.indicator-box .value.up {
  color: #f5222d;
}

.indicator-box .value.down {
  color: #52c41a;
}

.indicator-box .value.overbought {
  color: #f5222d;
}

.indicator-box .value.oversold {
  color: #52c41a;
}

.chart-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.chart-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #fa541c 0%, #fa8c16 100%);
  border-radius: 8px 8px 0 0;
}

.chart-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.kline-chart {
  height: 500px;
  border-radius: 0 0 8px 8px;
}

.sub-chart-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.sub-chart-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #722ed1 0%, #b37feb 100%);
  border-radius: 8px 8px 0 0;
}

.sub-chart-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.sub-chart {
  height: 250px;
}

.signal-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.signal-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #eb2f96 0%, #ff85c0 100%);
  border-radius: 8px 8px 0 0;
}

.signal-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.signal-item {
  margin-bottom: 12px;
  border-radius: 8px;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
}

.signal-item:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.signal-item .signal-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.signal-item .indicator-name {
  font-weight: bold;
  margin-top: 8px;
}

.signal-item .description {
  margin-top: 4px;
  margin-bottom: 0;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.info-card {
  text-align: center;
}

.info-text {
  font-size: 12px;
  color: #999;
}

/* 自定义策略解读样式 */
.custom-strategy {
  margin-top: 16px;
}

.custom-strategy .ant-divider {
  margin: 16px 0;
}

.custom-strategy .strategy-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.custom-strategy .strategy-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.custom-strategy .strategy-card.bull {
  border-left: 4px solid #52c41a;
}

.custom-strategy .strategy-card.bear {
  border-left: 4px solid #f5222d;
}

.custom-strategy .strategy-card.neutral {
  border-left: 4px solid #faad14;
}

.custom-strategy .strategy-content .signal-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.custom-strategy .strategy-content .signal-item .label {
  color: #666;
}

.custom-strategy .strategy-content .signal-item .value {
  font-weight: 500;
}

.custom-strategy .strategy-content .signal-item .value.bull {
  color: #52c41a;
}

.custom-strategy .strategy-content .signal-item .value.bear {
  color: #f5222d;
}

/* 投资建议样式 */
.investment-advice {
  padding: 8px;
}

.advice-card {
  margin-bottom: 8px;
}

.advice-card.overall {
  background: linear-gradient(135deg, #f0f5ff 0%, #fff7e6 100%);
}

.advice-item {
  text-align: center;
  padding: 12px;
}

.advice-item .label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.advice-item .score {
  font-size: 28px;
  font-weight: 700;
}

.advice-item .score.green {
  color: #52c41a;
}

.advice-item .score.orange {
  color: #faad14;
}

.advice-item .score.red {
  color: #f5222d;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  color: #333;
}

.position-advice {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.position-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.position-item .label {
  font-size: 13px;
  color: #666;
}

.position-item .value {
  font-size: 14px;
  font-weight: 600;
}

.position-item .value.green {
  color: #52c41a;
}

.position-item .value.red {
  color: #f5222d;
}

/* 投资建议增强样式 */
.advice-item {
  text-align: center;
  padding: 16px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  margin: 0 auto 8px;
  background: #f0f0f0;
}

.score-circle.green { background: #f6ffed; color: #52c41a; border: 3px solid #52c41a; }
.score-circle.orange { background: #fffbe6; color: #faad14; border: 3px solid #faad14; }
.score-circle.red { background: #fff1f0; color: #f5222d; border: 3px solid #f5222d; }

.score-label {
  font-size: 12px;
  color: #888;
}

.score-bars {
  padding: 8px 16px;
}

.score-bar-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.score-bar-item .bar-label {
  width: 70px;
  font-size: 12px;
  color: #666;
}

.score-bar-item .bar-value {
  width: 40px;
  text-align: right;
  font-size: 12px;
  font-weight: bold;
}

.status-card {
  height: 100%;
}

.status-value {
  text-align: center;
  padding: 12px 0;
}

.status-desc {
  text-align: center;
  font-size: 12px;
  color: #888;
  margin: 8px 0 0;
}

.signal-stats {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
}

.score-legend {
  padding: 8px;
}

.score-legend .legend-item {
  margin-bottom: 16px;
}

.score-legend h4 {
  margin-bottom: 8px;
  color: #333;
}

.score-legend ul {
  padding-left: 20px;
  margin: 0;
}

.score-legend li {
  font-size: 12px;
  color: #666;
  line-height: 1.8;
}
</style>

<style scoped>
/* 移动端适配 */
@media (max-width: 768px) {
  :deep(.ant-card) {
    margin-bottom: 8px;
    border-radius: 8px;
  }
  :deep(.ant-card-body) {
    padding: 12px;
  }
  :deep(.ant-table) {
    font-size: 12px;
  }
  :deep(.ant-table-thead > tr > th) {
    padding: 8px;
    font-size: 11px;
  }
  :deep(.ant-table > td) {
    padding: -tbody > tr8px;
  }
}
</style>

<style scoped>
/* 移动端搜索模块 */
@media (max-width: 768px) {
  .search-card :deep(.ant-card-body) {
    padding: 12px;
  }
  .search-card :deep(.ant-input-search) {
    margin-bottom: 8px;
  }
  .search-card :deep(.ant-select) {
    width: 100% !important;
    margin-bottom: 8px;
  }

  /* K线图容器 - 移动端自适应 */
  .chart-card {
    width: 100% !important;
    max-width: 100vw !important;
  }
  .chart-card .kline-chart {
    width: 100% !important;
    min-width: 0 !important;
    height: 350px !important;
  }
  .chart-card :deep(.ant-card-body) {
    padding: 8px !important;
    width: 100% !important;
    max-width: 100vw !important;
  }
  
  /* 子图表移动端 */
  .sub-chart-card {
    width: 100% !important;
    max-width: 100vw !important;
  }
  .sub-chart-card .sub-chart {
    width: 100% !important;
    min-width: 0 !important;
    height: 200px !important;
  }
  .sub-chart-card :deep(.ant-card-body) {
    padding: 8px !important;
    width: 100% !important;
    max-width: 100vw !important;
  }
}
</style>
