
function showStatistics() {
    console.log('showStatistics called');
    hideAllDashboardViews();
    document.getElementById('adminDashboard').style.display = 'block';
    setAdminActiveMenu('statistics');
    
    const container = document.getElementById('statisticsContainer');
    if (container) {
        container.style.display = 'block';
        container.style.width = '100%';
        container.style.padding = '20px';
        container.style.background = 'white';
        container.style.minHeight = '80vh';
        console.log('statisticsContainer displayed');
        
        const token = getAuthToken();
        if (!token) {
            console.warn('No authentication token found');
            container.innerHTML = `
                <div style="position:relative; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                    <h2 style="color:#1a4080; margin:0;"> Statistics Dashboard</h2>
                    <button onclick="closeStatistics()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
                </div>
                <div style="text-align:center; padding:60px; color:#ff9800;">
                    <div style="font-size:48px; margin-bottom:10px;"></div>
                    <h3>Authentication Required</h3>
                    <p>Please login to view statistics.</p>
                    <button onclick="logoutUser()" 
                            style="margin-top:15px; padding:10px 30px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
                        Go to Login
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                <h2 style="color:#1a4080; margin:0;"> Statistics Dashboard</h2>
                <button onclick="closeStatistics()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
            </div>
            
            <div id="statsQuickCards" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:15px; margin-bottom:25px;"></div>
            
            <div class="lcdjp-grid-2col" style="gap:20px; margin-bottom:20px;">
                <div style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <h4 style="color:#1a4080; margin-bottom:10px;"> Cases by Status</h4>
                    <canvas id="casesByStatusChart" height="250"></canvas>
                </div>
                <div style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <h4 style="color:#1a4080; margin-bottom:10px;"> Cases by Type</h4>
                    <canvas id="casesByTypeChart" height="250"></canvas>
                </div>
            </div>
            
            <div class="lcdjp-grid-2col" style="gap:20px; margin-bottom:20px;">
                <div style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <h4 style="color:#1a4080; margin-bottom:10px;"> Cases by Level</h4>
                    <canvas id="casesByLevelChart" height="250"></canvas>
                </div>
                <div style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <h4 style="color:#1a4080; margin-bottom:10px;"> User Distribution</h4>
                    <canvas id="userDistributionChart" height="250"></canvas>
                </div>
            </div>
            
            <div class="lcdjp-grid-2col" style="gap:20px; margin-bottom:20px;">
                <div style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <h4 style="color:#1a4080; margin-bottom:10px;"> Monthly Case Trends</h4>
                    <canvas id="monthlyTrendChart" height="250"></canvas>
                </div>
                <div style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <h4 style="color:#1a4080; margin-bottom:10px;"> Lawyer Performance</h4>
                    <canvas id="lawyerPerformanceChart" height="250"></canvas>
                </div>
            </div>
            
            <div class="lcdjp-grid-2col" style="gap:20px; margin-bottom:20px;">
                <div style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <h4 style="color:#1a4080; margin-bottom:10px;"> Top Locations</h4>
                    <canvas id="topLocationsChart" height="250"></canvas>
                </div>
            </div>
            
            <div style="background:white; padding:20px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.08); margin-top:20px; overflow-x:auto;">
                <h4 style="color:#1a4080; margin-bottom:15px;"> Detailed Statistics</h4>
                <div id="detailedStatsTable"></div>
            </div>
        `;
        
        console.log('Container HTML rebuilt, calling buildStatisticsDashboard...');
        buildStatisticsDashboard();
    } else {
        console.error('statisticsContainer not found');
    }
}


function exportChartAsImage(chartId, chartName) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        showToast('Chart not found.');
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.download = `LCDJP_Chart_${chartName || chartId}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Chart exported successfully!');
    } catch (error) {
        console.error('Error exporting chart:', error);
        showToast('Error exporting chart.');
    }
}
function closeStatistics() {
    showAdminHome();
}


async function buildStatisticsDashboard() {
    try {
        console.log('buildStatisticsDashboard started');
        
        const container = document.getElementById('statisticsContainer');
        if (!container) {
            console.error('statisticsContainer not found in DOM');
            return;
        }
        console.log('statisticsContainer found');

        const token = getAuthToken();
        if (!token) {
            console.warn('No authentication token found');
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#ff9800;">
                    <div style="font-size:48px; margin-bottom:10px;"></div>
                    <h3>Authentication Required</h3>
                    <p>Please login to view statistics.</p>
                    <button onclick="logoutUser()" 
                            style="margin-top:15px; padding:10px 30px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
                        Go to Login
                    </button>
                </div>
            `;
            return;
        }
        console.log('Token found');

        console.log('Fetching case analytics...');
        const analyticsResponse = await fetch(API_ENDPOINTS.caseAnalytics, {
            headers: getAuthHeaders()
        });

        if (!analyticsResponse.ok) {
            if (analyticsResponse.status === 401) {
                throw new Error('Session expired. Please login again.');
            }
            throw new Error('Failed to fetch case analytics');
        }

        const analyticsData = await analyticsResponse.json();
        console.log(`Fetched analytics for ${analyticsData.totalCases ?? 0} cases`);

        console.log('Fetching users...');
        const usersResponse = await fetch(API_ENDPOINTS.users, {
            headers: getAuthHeaders()
        });

        if (!usersResponse.ok) {
            if (usersResponse.status === 401) {
                throw new Error('Session expired. Please login again.');
            }
            throw new Error('Failed to fetch users');
        }

        const usersData = await usersResponse.json();
        let allUsers = [];
        if (Array.isArray(usersData)) {
            allUsers = usersData;
        } else if (usersData.users && Array.isArray(usersData.users)) {
            allUsers = usersData.users;
        }
        console.log(`Fetched ${allUsers.length} users`);

        const allLawyers = allUsers.filter(u => u.role === 'Lawyer');

        let persistedStats = {};
        try {
            const statsResponse = await fetch(API_ENDPOINTS.adminStatistics, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                persistedStats = statsData.statistics || {};
            }
        } catch (e) {
            console.warn('Persisted admin statistics unavailable; using loaded data:', e);
        }

        const byStatus = analyticsData.byStatus || {};
        const quickStats = [
            { label: 'Total Cases', value: persistedStats.totalCases ?? analyticsData.totalCases ?? 0 },
            { label: 'Pending', value: persistedStats.pendingCases ?? byStatus['Pending'] ?? 0 },
            { label: 'Resolved', value: persistedStats.resolvedCases ?? byStatus['Resolved'] ?? 0 },
            { label: 'With Lawyers', value: persistedStats.withLawyers ?? analyticsData.withLawyersCount ?? 0 },
            { label: 'Total Users', value: persistedStats.totalUsers ?? allUsers.length },
            { label: 'Citizens', value: persistedStats.citizens ?? allUsers.filter(u => u.role === 'Citizen').length },
            { label: 'Lawyers', value: persistedStats.lawyers ?? allLawyers.length }
        ];

        const cardsHtml = quickStats.map(stat => `
            <div class="stat-card" style="background:white; padding:15px; border-radius:10px; text-align:center; border:1px solid #e2e5ec; box-shadow:none;">
                <h3 style="margin:0 0 4px; font-size:26px; font-weight:700;">${escapeHtml(stat.value)}</h3>
                <p style="margin:0; color:#666; font-size:13px;">${escapeHtml(stat.label)}</p>
            </div>
        `).join('');

        const statsQuickCards = document.getElementById('statsQuickCards');
        if (statsQuickCards) {
            statsQuickCards.innerHTML = cardsHtml;
        } else {
            console.warn('statsQuickCards element not found');
        }

        Object.keys(statsCharts).forEach(key => {
            if (statsCharts[key]) {
                statsCharts[key].destroy();
                delete statsCharts[key];
            }
        });

        const statusData = await getCasesByStatusData(analyticsData);
        const statusChart = document.getElementById('casesByStatusChart');
        if (statusChart && statusData.labels.length > 0) {
            statsCharts.casesByStatus = new Chart(
                statusChart.getContext('2d'),
                {
                    type: 'doughnut',
                    data: {
                        labels: statusData.labels,
                        datasets: [{
                            data: statusData.values,
                            backgroundColor: ['#ff9800', '#28a745', '#17a2b8', '#1a4080', '#dc3545'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { size: 11 } } }
                        }
                    }
                }
            );
        }

        const typeData = await getCasesByTypeData(analyticsData);
        const typeChart = document.getElementById('casesByTypeChart');
        if (typeChart && typeData.labels.length > 0) {
            statsCharts.casesByType = new Chart(
                typeChart.getContext('2d'),
                {
                    type: 'bar',
                    data: {
                        labels: typeData.labels,
                        datasets: [{
                            label: 'Cases by Type',
                            data: typeData.values,
                            backgroundColor: ['#1a4080', '#17a2b8', '#28a745', '#ff9800', '#dc3545', '#6c757d'],
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                }
            );
        }

        const levelData = await getCasesByLevelData(analyticsData);
        const levelChart = document.getElementById('casesByLevelChart');
        if (levelChart && levelData.labels.length > 0) {
            statsCharts.casesByLevel = new Chart(
                levelChart.getContext('2d'),
                {
                    type: 'pie',
                    data: {
                        labels: levelData.labels,
                        datasets: [{
                            data: levelData.values,
                            backgroundColor: ['#1a4080', '#17a2b8', '#28a745', '#ff9800', '#dc3545', '#6c757d'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { size: 11 } } }
                        }
                    }
                }
            );
        }

        const monthlyData = await getMonthlyTrendData(analyticsData);
        const monthlyChart = document.getElementById('monthlyTrendChart');
        if (monthlyChart && monthlyData.labels.length > 0) {
            statsCharts.monthlyTrend = new Chart(
                monthlyChart.getContext('2d'),
                {
                    type: 'line',
                    data: {
                        labels: monthlyData.labels,
                        datasets: [
                            {
                                label: 'Total Cases',
                                data: monthlyData.total,
                                borderColor: '#1a4080',
                                backgroundColor: 'rgba(26, 64, 128, 0.1)',
                                fill: true,
                                tension: 0.4
                            },
                            {
                                label: 'Resolved',
                                data: monthlyData.resolved,
                                borderColor: '#28a745',
                                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                fill: true,
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top', labels: { font: { size: 11 } } }
                        },
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                }
            );
        }

        const userData = await getUserDistributionData();
        const userChart = document.getElementById('userDistributionChart');
        if (userChart && userData.labels.length > 0 && userData.values.some(v => v > 0)) {
            statsCharts.userDistribution = new Chart(
                userChart.getContext('2d'),
                {
                    type: 'pie',
                    data: {
                        labels: userData.labels,
                        datasets: [{
                            data: userData.values,
                            backgroundColor: userData.colors || ['#1a4080', '#17a2b8', '#ff9800', '#28a745'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { size: 11 } } }
                        }
                    }
                }
            );
        }

        const lawyerPerfData = await getLawyerPerformanceData(analyticsData);
        const perfChart = document.getElementById('lawyerPerformanceChart');
        if (perfChart && lawyerPerfData.labels.length > 0) {
            statsCharts.lawyerPerformance = new Chart(
                perfChart.getContext('2d'),
                {
                    type: 'bar',
                    data: {
                        labels: lawyerPerfData.labels,
                        datasets: [
                            {
                                label: 'Resolved',
                                data: lawyerPerfData.resolved,
                                backgroundColor: '#28a745',
                                borderRadius: 4
                            },
                            {
                                label: 'Pending',
                                data: lawyerPerfData.pending,
                                backgroundColor: '#ff9800',
                                borderRadius: 4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        indexAxis: 'y',
                        plugins: {
                            legend: { position: 'top', labels: { font: { size: 11 } } }
                        },
                        scales: {
                            x: { beginAtZero: true }
                        }
                    }
                }
            );
        }

        const locationData = await getTopLocationsData(analyticsData);
        const locationChart = document.getElementById('topLocationsChart');
        if (locationChart && locationData.labels.length > 0) {
            statsCharts.topLocations = new Chart(
                locationChart.getContext('2d'),
                {
                    type: 'bar',
                    data: {
                        labels: locationData.labels,
                        datasets: [{
                            label: 'Cases by Location',
                            data: locationData.values,
                            backgroundColor: ['#1a4080', '#17a2b8', '#28a745', '#ff9800', '#dc3545'],
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                }
            );
        }

        const subData = await getSubscriptionStatusData();
        const subChart = document.getElementById('subscriptionStatusChart');
        if (subChart && subData.labels.length > 0) {
            statsCharts.subscriptionStatus = new Chart(
                subChart.getContext('2d'),
                {
                    type: 'doughnut',
                    data: {
                        labels: subData.labels,
                        datasets: [{
                            data: subData.values,
                            backgroundColor: ['#28a745', '#dc3545', '#ff9800'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { size: 11 } } }
                        }
                    }
                }
            );
        }

        const chartContainers = document.querySelectorAll('#statisticsContainer > div > div');
        chartContainers.forEach((containerEl, index) => {
            const canvas = containerEl.querySelector('canvas');
            if (canvas && !containerEl.querySelector('.export-btn')) {
                const exportBtn = document.createElement('button');
                exportBtn.className = 'export-btn';
                exportBtn.textContent = ' Export Chart';
                exportBtn.style.cssText = `
                    margin-top: 8px;
                    padding: 4px 12px;
                    background: #1a4080;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                `;
                exportBtn.onclick = function() {
                    const chartId = canvas.id;
                    const chartName = chartId.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim();
                    if (typeof exportChartAsImage === 'function') {
                        exportChartAsImage(chartId, chartName);
                    }
                };
                canvas.parentNode.appendChild(exportBtn);
            }
        });

        if (typeof buildDetailedStats === 'function') {
            buildDetailedStats(analyticsData, allUsers, allLawyers);
        }
        
        console.log('Statistics dashboard built successfully');

    } catch (error) {
        console.error('Error building statistics dashboard:', error);
        const container = document.getElementById('statisticsContainer');
        if (container) {
            container.innerHTML = `
                <div style="position:relative;text-align:center;padding:40px;color:#dc3545;">
                    <button onclick="showAdminHome()" aria-label="Close" style="position:absolute;top:0;right:0;background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
                    <div style="font-size:32px;margin-bottom:10px;"></div>
                    <p style="font-weight:bold;">Statistics Unavailable</p>
                    <p style="color:#666;font-size:14px;">${escapeHtml(error.message)}</p>
                    <button onclick="buildStatisticsDashboard()" style="margin-top:15px;padding:10px 30px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;">
                         Retry
                    </button>
                </div>
            `;
        }
    }
}


function getCasesByStatusData(analytics) {
    const byStatus = (analytics && analytics.byStatus) || {};
    return {
        labels: Object.keys(byStatus),
        values: Object.values(byStatus)
    };
}

function getCasesByTypeData(analytics) {
    const byType = (analytics && analytics.byType) || [];
    return {
        labels: byType.map(item => item.label),
        values: byType.map(item => item.count)
    };
}

function getCasesByLevelData(analytics) {
    const byLevel = (analytics && analytics.byLevel) || {};
    return {
        labels: Object.keys(byLevel),
        values: Object.values(byLevel)
    };
}

async function getUserDistributionData() {
    try {
        const token = getAuthToken();
        

        const response = await fetch(API_ENDPOINTS.users, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        
        let users = [];
        if (Array.isArray(data)) {
            users = data;
        } else if (data.users && Array.isArray(data.users)) {
            users = data.users;
        } else if (data.data && Array.isArray(data.data)) {
            users = data.data;
        } else {
            console.warn('Unexpected response format:', data);
            return {
                labels: ['Citizen', 'Lawyer', 'Admin'],
                values: [0, 0, 0],
                colors: ['#17a2b8', '#1a4080', '#dc3545']
            };
        }
        
        const roles = {
            'Citizen': 0,
            'Lawyer': 0,
            'Admin': 0,
            'System Administrator': 0
        };
        
        users.forEach(user => {
            const role = user.role || user.userType || 'Unknown';
            if (roles.hasOwnProperty(role)) {
                roles[role]++;
            } else {
                roles['Unknown'] = (roles['Unknown'] || 0) + 1;
            }
        });
        
        const labels = Object.keys(roles);
        const values = Object.values(roles);
        const colors = {
            'Citizen': '#17a2b8',
            'Lawyer': '#1a4080',
            'Admin': '#dc3545',
            'System Administrator': '#dc3545',
            'Unknown': '#6c757d'
        };
        
        return {
            labels: labels,
            values: values,
            colors: labels.map(label => colors[label] || '#6c757d')
        };
    } catch (error) {
        console.error('Error fetching user distribution:', error);
        return {
            labels: ['Citizen', 'Lawyer', 'Admin'],
            values: [0, 0, 0],
            colors: ['#17a2b8', '#1a4080', '#dc3545']
        };
    }
}

function getMonthlyTrendData(analytics) {
    const trend = (analytics && analytics.monthlyTrend) || [];
    return {
        labels: trend.map(m => m.label),
        total: trend.map(m => m.total),
        resolved: trend.map(m => m.resolved)
    };
}

function getLawyerPerformanceData(analytics) {
    const perf = (analytics && analytics.lawyerPerformance) || [];
    if (perf.length === 0) {
        return { labels: ['No Activity'], resolved: [0], pending: [0] };
    }
    return {
        labels: perf.map(l => l.name),
        resolved: perf.map(l => l.resolved),
        pending: perf.map(l => l.pending)
    };
}

function getTopLocationsData(analytics) {
    const locations = (analytics && analytics.topLocations) || [];
    return {
        labels: locations.map(l => l.label),
        values: locations.map(l => l.count)
    };
}
async function getSubscriptionStatusData() {
    try {
        const token = getAuthToken();
        

        const response = await fetch(API_ENDPOINTS.users, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        
        let users = [];
        if (Array.isArray(data)) {
            users = data;
        } else if (data.users && Array.isArray(data.users)) {
            users = data.users;
        } else if (data.data && Array.isArray(data.data)) {
            users = data.data;
        } else {
            console.warn('Unexpected response format:', data);
            return { labels: ['No Data'], values: [1] };
        }
        
        const lawyers = users.filter(u => u.role === 'Lawyer' || u.userType === 'Lawyer');
        
        if (lawyers.length === 0) {
            return { labels: ['No Lawyers'], values: [1] };
        }
        
        let active = 0;
        let inactive = 0;
        let expired = 0;
        
        lawyers.forEach(l => {
            const status = l.subscriptionStatus || l.subscription || 'Inactive';
            if (status === 'Active' || status === 'active') {
                active++;
            } else if (status === 'Expired' || status === 'expired') {
                expired++;
            } else {
                inactive++;
            }
        });
        
        if (active === 0 && expired === 0) {
            return { labels: ['Inactive'], values: [inactive] };
        }
        
        return {
            labels: ['Active', 'Inactive', 'Expired'],
            values: [active, inactive, expired]
        };
    } catch (error) {
        console.error('Error fetching subscription status:', error);
        return { labels: ['Error'], values: [1] };
    }
}

function buildDetailedStats(analytics, users, lawyers) {
    const totalCases = analytics.totalCases || 0;
    const byStatus = analytics.byStatus || {};
    const pending = byStatus['Pending'] || 0;
    const resolved = byStatus['Resolved'] || 0;
    const withLawyers = analytics.withLawyersCount || 0;
    const forwardedToHigher = analytics.forwardedToHigherCount || 0;
    const pct = (n) => totalCases > 0 ? Math.round(n / totalCases * 100) : 0;

    const tableHtml = `
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
                <tr style="background:#1a4080; color:white;">
                    <th style="padding:10px; text-align:left;">Metric</th>
                    <th style="padding:10px; text-align:right;">Count</th>
                    <th style="padding:10px; text-align:right;">Percentage</th>
                </tr>
            </thead>
            <tbody>
                <tr style="border-bottom:1px solid #ddd;">
                    <td><strong>Total Cases</strong></td>
                    <td style="text-align:right;">${totalCases}</td>
                    <td style="text-align:right;">100%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd; background:#f9f9f9;">
                    <td>├─ Pending</td>
                    <td style="text-align:right;">${pending}</td>
                    <td style="text-align:right;">${pct(pending)}%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd;">
                    <td>├─ Resolved</td>
                    <td style="text-align:right;">${resolved}</td>
                    <td style="text-align:right;">${pct(resolved)}%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd; background:#f9f9f9;">
                    <td>├─ With Lawyers</td>
                    <td style="text-align:right;">${withLawyers}</td>
                    <td style="text-align:right;">${pct(withLawyers)}%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd;">
                    <td>└─ Forwarded to Higher</td>
                    <td style="text-align:right;">${forwardedToHigher}</td>
                    <td style="text-align:right;">${pct(forwardedToHigher)}%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd; background:#f9f9f9;">
                    <td><strong>Total Users</strong></td>
                    <td style="text-align:right;">${escapeHtml(users.length)}</td>
                    <td style="text-align:right;">100%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd;">
                    <td>├─ Citizens</td>
                    <td style="text-align:right;">${users.filter(u => u.userType === 'Citizen').length}</td>
                    <td style="text-align:right;">${users.length > 0 ? Math.round(users.filter(u => u.userType === 'Citizen').length / users.length * 100) : 0}%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd; background:#f9f9f9;">
                    <td>├─ Lawyers</td>
                    <td style="text-align:right;">${escapeHtml(lawyers.length)}</td>
                    <td style="text-align:right;">${users.length > 0 ? Math.round(lawyers.length / users.length * 100) : 0}%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd;">
                    <td>└─ Subscribed Lawyers</td>
                    <td style="text-align:right;">${lawyers.filter(l => isLawyerSubscribed(l.username)).length}</td>
                    <td style="text-align:right;">${lawyers.length > 0 ? Math.round(lawyers.filter(l => isLawyerSubscribed(l.username)).length / lawyers.length * 100) : 0}%</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd; background:#f9f9f9;">
                    <td><strong>Case Types</strong></td>
                    <td style="text-align:right;">${escapeHtml(analytics.distinctCaseTypes || 0)}</td>
                    <td style="text-align:right;">-</td>
                </tr>
                <tr style="border-bottom:1px solid #ddd;">
                    <td><strong>Active Locations</strong></td>
                    <td style="text-align:right;">${escapeHtml(analytics.distinctLocations || 0)}</td>
                    <td style="text-align:right;">-</td>
                </tr>
            </tbody>
        </table>
    `;
    
    document.getElementById('detailedStatsTable').innerHTML = tableHtml;
}

async function getLawyerSubscription(username) {
    return {
        subscriptionId: 'SUB-DISABLED',
        transactionRef: 'N/A',
        startDate: new Date().toISOString(),
        status: 'active',
        paymentMethod: 'System',
        phoneNumber: 'N/A',
        amount: 0,
        paymentDate: new Date().toISOString()
    };
}

async function saveLawyerSubscription(username, subscriptionData) {
    console.log('Subscription save disabled:', username);
    return { success: true, message: 'Subscription feature is disabled' };
}

async function isLawyerSubscribed(username) {
    return true;
}

async function getSubscriptionDaysRemaining(username) {
    return 30;
}
let selectedPaymentMethod = '';
let pendingCaseId = '';


function closeSubscriptionModal() {
    const modal = document.getElementById('subscriptionModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.getElementById('subscriptionSuccess').style.display = 'none';
    document.getElementById('alreadySubscribed').style.display = 'none';
    document.getElementById('subscriptionForm').style.display = 'none';
    document.getElementById('paymentDetailsContainer').style.display = 'none';
    selectedPaymentMethod = '';
}


function showToast(message) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 25px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: fadeInUp 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOutDown 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, 3000);
}


async function acceptCaseDirectly(caseId) {
    const username  = sessionStorage.getItem('lcdjp_username');
    const fullname  = sessionStorage.getItem('lcdjp_fullname') || username;

    try {
        
        const caseResp = await fetch(API_ENDPOINTS.case(caseId), {
            headers: { 'Content-Type': 'application/json' }
        });
        if (!caseResp.ok) { alert('Case not found.'); return; }
        const caseData = await caseResp.json();
        const foundCase = caseData.case || caseData;

        
        let lawyerSpec = 'N/A';
        try {
            const lResp = await fetch(API_ENDPOINTS.user(username), {headers: { 'Content-Type': 'application/json' }
            });
            if (lResp.ok) {
                const lData = await lResp.json();
                const l = lData.user || lData;
                lawyerSpec = l.lawyer_specialization || l.lawyerSpecialization || 'N/A';
            }
        } catch (_) {  }

        
        await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status:                  'Accepted by Lawyer',
                current_level:           'Lawyer Panel Desk',
                assigned_lawyer:         username,
                assigned_specialization: lawyerSpec,
                current_handler:         username,
                handler_role:            'Lawyer',
                selected_lawyer_status:  'Accepted',
                messaging_enabled:       1,
                messaging_locked:        0,
                accepted_date:           new Date().toISOString()
            })
        });

        
        const citizenId = foundCase.citizen_id || foundCase.citizenUsername || foundCase.citizen;
        _lcdjpCreateNotification(
            citizenId,
            `Your case ${caseId} has been accepted by a lawyer (${fullname}).`,
            'case_accepted',
            caseId
        );
        if (foundCase.assigned_lc) {
            _lcdjpCreateNotification(
                foundCase.assigned_lc,
                `Case ${caseId} has been accepted by lawyer ${fullname}. You can no longer edit this case.`,
                'case_accepted',
                caseId
            );
        }

        alert(`Case ${caseId} has been accepted successfully!`);

        
        try {
            const _accTlResp = await fetch(API_ENDPOINTS.case(caseId), {headers: { 'Content-Type': 'application/json' }
            });
            if (_accTlResp.ok) {
                const _accTlData = await _accTlResp.json();
                const _accTlCase = _accTlData.case || _accTlData;
                const _accTimeline = _accTlCase.timeline
                    ? (typeof _accTlCase.timeline === 'string' ? JSON.parse(_accTlCase.timeline) : _accTlCase.timeline)
                    : [];
                _accTimeline.push({
                    action:    'Case Accepted by Lawyer',
                    details:   `Case assigned to and accepted by Lawyer: ${fullname} (${username})`,
                    actor:     username,
                    timestamp: new Date().toLocaleString()
                });
                await fetch(API_ENDPOINTS.case(caseId), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ timeline: JSON.stringify(_accTimeline) })
                });
            }
        } catch (_accTlErr) { console.warn('Failed to update acceptance timeline:', _accTlErr); }

        updateLawyerDashboardCases();
        updateLawyerStatistics();
        renderNavbarNotifBadge();

        
        if (typeof viewCase === 'function') {
            await viewCase(caseId);
        }

    } catch (error) {
        console.error('acceptCaseDirectly error:', error);
        alert('Failed to accept case: ' + error.message);
    }
}


function updateLawyerSubscriptionStatus() {
    console.log('Subscription feature is disabled');
    return true;
}

function showLawyerManagement() {
    hideAllDashboardViews();
    document.getElementById("adminDashboard").style.display = "block";

    
    ['adminHomeContainer', 'approvalContainer', 'userManagementContainer',
     'lawyerPerformanceContainer', 'pdfExportContainer', 'statisticsContainer', 
     'searchResultsContainer', 'adminNotificationsPage'
    ].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    let container = document.getElementById('lawyerManagementContainer');
    if (!container) {
        
        container = document.createElement('div');
        container.id = 'lawyerManagementContainer';
        container.style.display = 'block';
        document.getElementById('adminDashboard').appendChild(container);
    } else {
        container.style.display = 'block';
    }
    
    
    buildLawyerManagementContent();
}

function buildLawyerManagementContent() {
    const container = document.getElementById('lawyerManagementContainer');
    if (!container) {
        console.error('lawyerManagementContainer not found!');
        return;
    }
    
    const token = getAuthToken();
    if (!token) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#dc3545;">Please login to view lawyers.</div>';
        return;
    }
    
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Loading lawyers...</div>';
    
    fetch(API_ENDPOINTS.users, {
        headers: getAuthHeaders()
    })
    .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    })
    .then(function(data) {
        var users = data.users || [];
        
        var lawyers = users.filter(function(u) {
            return u.role === 'Lawyer' || u.userType === 'Lawyer';
        });
        displayLawyerManagementContent(lawyers);
    })
    .catch(function(error) {
        console.error('Error loading lawyers:', error);
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#dc3545;">Error loading lawyers: ' + escapeHtml(error.message) + '</div>';
    });
}

function displayLawyerManagementContent(lawyers) {
    const container = document.getElementById('lawyerManagementContainer');
    if (!container) return;
    
    
    var approvedLawyers = lawyers.filter(function(l) {
        return l.approval_status === 'Approved' || l.approvalStatus === 'Approved';
    });
    
    var pendingLawyers = lawyers.filter(function(l) {
        return l.approval_status === 'Pending' || l.approvalStatus === 'Pending';
    });
    
    var html = `
        <div style="background:white; border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                <div>
                    <h2 style="color:#1a4080; margin:0;">Lawyer Management</h2>
                    <p style="color:#666; font-size:13px; margin:5px 0 0 0;">
                        Total Lawyers: ${escapeHtml(lawyers.length)} 
                        (Approved: ${escapeHtml(approvedLawyers.length)} | Pending: ${escapeHtml(pendingLawyers.length)})
                    </p>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <input type="text" id="lawyerSearchInput" placeholder="Search by name, username, specialization..." 
                           onkeyup="filterLawyers()" style="padding:8px 14px; border:1px solid #ccc; border-radius:6px; font-size:14px; width:200px;">
                    <button onclick="buildLawyerManagementContent()" style="padding:8px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:500;">
                        Refresh
                    </button>
                    <button onclick="showAdminHome()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
                </div>
            </div>
    `;
    
    if (lawyers.length === 0) {
        html += `
            <div style="text-align:center; padding:40px; color:#999;">
                <div style="font-size:48px; margin-bottom:10px;"></div>
                <p>No lawyers registered yet.</p>
            </div>
        `;
    } else {
        html += `<div style="overflow-x:auto;">`;
        html += `<table style="width:100%; border-collapse:collapse; font-size:13px;">`;
        html += `
            <thead>
                <tr style="background:#1a4080; color:white;">
                    <th style="padding:10px 12px; text-align:left;">Name</th>
                    <th style="padding:10px 12px; text-align:left;">Username</th>
                    <th style="padding:10px 12px; text-align:left;">Specialization</th>
                    <th style="padding:10px 12px; text-align:left;">Law Firm</th>
                    <th style="padding:10px 12px; text-align:left;">Phone</th>
                    <th style="padding:10px 12px; text-align:left;">Status</th>
                    <th style="padding:10px 12px; text-align:left;">Actions</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        lawyers.forEach(function(l) {
            var statusColor = l.approval_status === 'Approved' || l.approvalStatus === 'Approved' ? '#28a745' : 
                             l.approval_status === 'Pending' || l.approvalStatus === 'Pending' ? '#ff9800' : '#dc3545';
            var statusText = l.approval_status || l.approvalStatus || 'Pending';
            var firstName = l.first_name || l.firstName || '';
            var lastName = l.last_name || l.lastName || '';
            var username = l.username || '';
            var specialization = l.lawyer_specialization || l.lawyerSpecialization || 'N/A';
            var lawFirm = l.law_firm_name || l.lawFirmName || 'N/A';
            var phone = l.phone || l.phoneNumber || 'N/A';
            
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px 12px; font-weight:500;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</td>
                    <td style="padding:10px 12px; font-family:monospace;">${escapeHtml(username)}</td>
                    <td style="padding:10px 12px;">${escapeHtml(specialization)}</td>
                    <td style="padding:10px 12px;">${escapeHtml(lawFirm)}</td>
                    <td style="padding:10px 12px;">${escapeHtml(phone)}</td>
                    <td style="padding:10px 12px;">
                        <span style="background:${statusColor}; color:white; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600;">
                            ${statusText}
                        </span>
                    </td>
                    <td style="padding:10px 12px;">
                        <button onclick="viewUserDetails(${escapeHtml(JSON.stringify(username))})" style="padding:4px 12px; background:#1a4080; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px; margin-right:5px;">
                            View
                        </button>
                        ${statusText === 'Pending' ? `
                            <button onclick="approveVerification(${escapeHtml(JSON.stringify(username))})" style="padding:4px 12px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px; margin-right:5px;">
                                Approve
                            </button>
                            <button onclick="openVerifyModal(${escapeHtml(JSON.stringify(username))})" style="padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
                                Review & Reject
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        html += `
            </tbody>
            </table>
            </div>
        `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}


function filterLawyers() {
    const searchInput = document.getElementById('lawyerSearch');
    if (!searchInput) return;
    
    const search = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll('#lawyerListContainer > div > div');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? 'block' : 'none';
    });
}


function showLawyerPerformance() {
    hideAllDashboardViews();
    document.getElementById('adminDashboard').style.display = 'block';
    document.getElementById('lawyerPerformanceContainer').style.display = 'block';
    
    let container = document.getElementById('lawyerPerformanceContainer');
    
    let lawyers = [];
    for (const _lsKey of Object.keys(_lcdjp_user_index)) {
        let key = _lsKey;
        if (key && key.startsWith('user_')) {
            let user = (_lcdjp_user_index[key] || {});
            if (user.userType === 'Lawyer' && user.approvalStatus === 'Approved') {
                lawyers.push(user);
            }
        }
    }
    
    if (lawyers.length === 0) {
        container.innerHTML = `<p style="color:#999; text-align:center; padding:30px;">No approved lawyers found.</p>`;
        return;
    }
    
    let performanceData = lawyers.map(lawyer => {
        let assignedCases = cases.filter(c => c.assignedLawyer === lawyer.username);
        let acceptedCases = assignedCases.filter(c => c.status === 'Accepted by Lawyer');
        let resolvedCases = assignedCases.filter(c => c.status === 'Resolved');
        let totalCases = assignedCases.length;
        let resolvedCount = resolvedCases.length;
        let acceptedCount = acceptedCases.length;
        let pendingCount = totalCases - acceptedCount - resolvedCount;
        
        let resolutionRate = totalCases > 0 ? Math.round((resolvedCount / totalCases) * 100) : 0;
        
        let resolutionTimes = [];
        resolvedCases.forEach(c => {
            if (c.timeline) {
                let acceptedDate = null;
                let resolvedDate = null;
                
                c.timeline.forEach(entry => {
                    if (entry.action === 'Case Accepted') {
                        acceptedDate = new Date(entry.timestamp);
                    }
                    if (entry.action === 'Case Resolved') {
                        resolvedDate = new Date(entry.timestamp);
                    }
                });
                
                if (acceptedDate && resolvedDate) {
                    let daysDiff = Math.floor((resolvedDate - acceptedDate) / (1000 * 60 * 60 * 24));
                    resolutionTimes.push(daysDiff);
                }
            }
        });
        
        let avgResolutionTime = resolutionTimes.length > 0 
            ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) 
            : 0;
        
        let isSubscribed = isLawyerSubscribed(lawyer.username);
        let daysRemaining = getSubscriptionDaysRemaining(lawyer.username);
        
        return {
            ...lawyer,
            totalCases,
            acceptedCount,
            resolvedCount,
            pendingCount,
            resolutionRate,
            avgResolutionTime,
            isSubscribed,
            daysRemaining,
            resolutionTimes
        };
    });
    
    performanceData.sort((a, b) => b.totalCases - a.totalCases);
    
    let totalAllCases = performanceData.reduce((sum, p) => sum + p.totalCases, 0);
    let totalResolved = performanceData.reduce((sum, p) => sum + p.resolvedCount, 0);
    let totalAccepted = performanceData.reduce((sum, p) => sum + p.acceptedCount, 0);
    let totalPending = performanceData.reduce((sum, p) => sum + p.pendingCount, 0);
    let overallResolutionRate = totalAllCases > 0 ? Math.round((totalResolved / totalAllCases) * 100) : 0;
    let activeLawyers = performanceData.filter(p => p.totalCases > 0).length;
    let subscribedLawyers = performanceData.filter(p => p.isSubscribed).length;
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 style="color:#1a4080; margin:0;"> Lawyer Performance Dashboard</h2>
            <button onclick="showAdminHome()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
        </div>
        
        
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:15px; margin-bottom:25px;">
            <div style="background:white; color:#1a4080; padding:15px; border-radius:10px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                <h3 style="font-size:28px; margin:0;">${totalAllCases}</h3>
                <p style="margin:5px 0 0 0; font-size:13px;">Total Cases</p>
            </div>
            <div style="background:white; color:#1a4080; padding:15px; border-radius:10px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                <h3 style="font-size:28px; margin:0;">${totalResolved}</h3>
                <p style="margin:5px 0 0 0; font-size:13px;">Resolved</p>
            </div>
            <div style="background:white; color:#1a4080; padding:15px; border-radius:10px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                <h3 style="font-size:28px; margin:0;">${totalPending}</h3>
                <p style="margin:5px 0 0 0; font-size:13px;">Pending</p>
            </div>
            <div style="background:white; color:#1a4080; padding:15px; border-radius:10px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                <h3 style="font-size:28px; margin:0;">${overallResolutionRate}%</h3>
                <p style="margin:5px 0 0 0; font-size:13px;">Resolution Rate</p>
            </div>
            <div style="background:white; color:#1a4080; padding:15px; border-radius:10px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                <h3 style="font-size:28px; margin:0;">${activeLawyers}</h3>
                <p style="margin:5px 0 0 0; font-size:13px;">Active Lawyers</p>
            </div>
            <div style="background:white; color:#1a4080; padding:15px; border-radius:10px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                <h3 style="font-size:28px; margin:0;">${subscribedLawyers}/${escapeHtml(lawyers.length)}</h3>
                <p style="margin:5px 0 0 0; font-size:13px;">Subscribed</p>
            </div>
        </div>
        
        
        <div style="display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap;">
            <input type="text" id="performanceSearch" placeholder="Search lawyer by name..." 
                   style="flex:1; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; min-width:200px;"
                   onkeyup="filterPerformance()">
            <select id="performanceFilter" onchange="filterPerformance()" style="padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;">
                <option value="all">All Lawyers</option>
                <option value="active">With Cases</option>
                <option value="subscribed">Subscribed</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="top">Top Performers</option>
            </select>
        </div>
        
        
        <div style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#1a4080; color:white;">
                            <th style="padding:12px 15px; text-align:left;">Lawyer</th>
                            <th style="padding:12px 15px; text-align:center;">Specialization</th>
                            <th style="padding:12px 15px; text-align:center;">Total Cases</th>
                            <th style="padding:12px 15px; text-align:center;">Accepted</th>
                            <th style="padding:12px 15px; text-align:center;">Resolved</th>
                            <th style="padding:12px 15px; text-align:center;">Pending</th>
                            <th style="padding:12px 15px; text-align:center;">Rate</th>
                            <th style="padding:12px 15px; text-align:center;">Avg Days</th>
                            <th style="padding:12px 15px; text-align:center;">Status</th>
                            <th style="padding:12px 15px; text-align:center;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="performanceTableBody">
    `;
    
    performanceData.forEach((p, index) => {
        let statusColor = p.isSubscribed ? '#28a745' : '#ff9800';
        let statusText = p.isSubscribed ? ` ${p.daysRemaining}d` : ' Inactive';
        
        let rateColor = p.resolutionRate >= 70 ? '#28a745' : (p.resolutionRate >= 40 ? '#ff9800' : '#dc3545');
        
        html += `
            <tr class="performance-row" style="border-bottom:1px solid #eee; ${index % 2 === 0 ? 'background:#f9f9f9;' : ''}">
                <td style="padding:12px 15px;">
                    <strong>${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</strong>
                    <br><small style="color:#777;">@${escapeHtml(p.username)}</small>
                </td>
                <td style="padding:12px 15px; text-align:center; font-size:13px;">${escapeHtml(p.lawyerSpecialization || 'N/A')}</td>
                <td style="padding:12px 15px; text-align:center; font-weight:bold; font-size:18px;">${escapeHtml(p.totalCases)}</td>
                <td style="padding:12px 15px; text-align:center; color:#17a2b8;">${escapeHtml(p.acceptedCount)}</td>
                <td style="padding:12px 15px; text-align:center; color:#28a745; font-weight:bold;">${escapeHtml(p.resolvedCount)}</td>
                <td style="padding:12px 15px; text-align:center; color:#ff9800;">${escapeHtml(p.pendingCount)}</td>
                <td style="padding:12px 15px; text-align:center;">
                    <span style="background:${rateColor}; color:white; padding:3px 10px; border-radius:20px; font-weight:bold; font-size:14px;">
                        ${escapeHtml(p.resolutionRate)}%
                    </span>
                </td>
                <td style="padding:12px 15px; text-align:center; font-size:14px;">
                    ${p.avgResolutionTime > 0 ? p.avgResolutionTime + 'd' : 'N/A'}
                </td>
                <td style="padding:12px 15px; text-align:center;">
                    <span style="color:${statusColor}; font-weight:bold; font-size:13px;">${statusText}</span>
                </td>
                <td style="padding:12px 15px; text-align:center;">
                    <button onclick="viewLawyerPerformanceDetails(${escapeHtml(JSON.stringify(p.username))})" 
                            style="padding:6px 12px; background:#1a4080; color:white; border:none; border-radius:5px; cursor:pointer; font-size:12px;">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
        
        
        <div style="margin-top:20px; display:flex; gap:20px; flex-wrap:wrap; font-size:13px; color:#555; background:#f8f9fa; padding:15px; border-radius:8px;">
            <span> <strong>Resolution Rate:</strong> Percentage of cases resolved</span>
            <span> <strong>Avg Days:</strong> Average time to resolve a case</span>
            <span> <strong>Subscribed:</strong> Has active subscription</span>
            <span> <strong>Inactive:</strong> No active subscription</span>
        </div>
    `;
    
    container.innerHTML = html;
}

function filterPerformance() {
    let search = document.getElementById('performanceSearch').value.toLowerCase();
    let filter = document.getElementById('performanceFilter').value;
    let rows = document.querySelectorAll('.performance-row');
    
    rows.forEach(row => {
        let text = row.textContent.toLowerCase();
        let show = true;
        
        if (search && !text.includes(search)) {
            show = false;
        }
        
        if (show && filter !== 'all') {
            let totalCases = parseInt(row.querySelector('td:nth-child(3)').textContent) || 0;
            let isSubscribed = text.includes('');
            let resolutionRate = parseInt(row.querySelector('td:nth-child(7) span').textContent) || 0;
            
            switch(filter) {
                case 'active':
                    if (totalCases === 0) show = false;
                    break;

                case 'top':
                    if (resolutionRate < 50) show = false;
                    break;
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
}

function viewLawyerPerformanceDetails(username) {
    let user = _lcdjpStore.users.find(function(u){return u.username===username;}) || null;
    if (!user) {
        alert("Lawyer not found");
        return;
    }
    
    let lawyerCases = cases.filter(c => c.assignedLawyer === username);
    let acceptedCases = lawyerCases.filter(c => c.status === 'Accepted by Lawyer');
    let resolvedCases = lawyerCases.filter(c => c.status === 'Resolved');
    let pendingCases = lawyerCases.filter(c => !['Resolved', 'Accepted by Lawyer'].includes(c.status || ''));
    
    let isSubscribed = isLawyerSubscribed(username);
    let daysRemaining = getSubscriptionDaysRemaining(username);
    let subscription = getLawyerSubscription(username);
    
    let html = `
        <div class="form-card" style="max-width:900px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h2 style="color:#1a4080; margin:0;"> ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</h2>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="background:${isSubscribed ? '#28a745' : '#ff9800'}; color:white; padding:5px 15px; border-radius:20px; font-weight:bold;">
                        ${isSubscribed ? ` Subscribed (${daysRemaining}d remaining)` : ' Not Subscribed'}
                    </span>
                    <button onclick="showLawyerPerformance()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin:20px 0;">
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; text-align:center;">
                    <h3 style="font-size:32px; margin:0; color:#1a4080;">${escapeHtml(lawyerCases.length)}</h3>
                    <p style="margin:5px 0 0 0; color:#666;">Total Cases</p>
                </div>
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; text-align:center;">
                    <h3 style="font-size:32px; margin:0; color:#17a2b8;">${escapeHtml(acceptedCases.length)}</h3>
                    <p style="margin:5px 0 0 0; color:#666;">In Progress</p>
                </div>
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; text-align:center;">
                    <h3 style="font-size:32px; margin:0; color:#28a745;">${escapeHtml(resolvedCases.length)}</h3>
                    <p style="margin:5px 0 0 0; color:#666;">Resolved</p>
                </div>
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; text-align:center;">
                    <h3 style="font-size:32px; margin:0; color:#ff9800;">${escapeHtml(pendingCases.length)}</h3>
                    <p style="margin:5px 0 0 0; color:#666;">Pending</p>
                </div>
            </div>
            
            ${subscription ? `
            <div style="background:#f0f5ff; padding:15px; border-radius:8px; margin-bottom:20px; border-left:4px solid #1a4080;">
                <h4 style="color:#1a4080; margin:0 0 10px 0;">Subscription Details</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px;">
                    <div><strong>Payment Method:</strong> ${escapeHtml(subscription.paymentMethod || 'N/A')}</div>
                    <div><strong>Phone:</strong> ${escapeHtml(subscription.phoneNumber || 'N/A')}</div>
                    <div><strong>Transaction Ref:</strong> ${escapeHtml(subscription.transactionRef || 'N/A')}</div>
                    <div><strong>Payment Date:</strong> ${new Date(subscription.paymentDate).toLocaleDateString()}</div>
                </div>
            </div>` : ''}
            
            <h3 style="color:#1a4080; margin-top:20px;"> Case History</h3>
            
            ${lawyerCases.length === 0 ? `
                <p style="color:#999; text-align:center; padding:40px;">No cases assigned yet.</p>
            ` : `
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                    <thead>
                        <tr style="background:#1a4080; color:white;">
                            <th style="padding:10px; text-align:left;">Case ID</th>
                            <th style="padding:10px; text-align:left;">Type</th>
                            <th style="padding:10px; text-align:left;">Citizen</th>
                            <th style="padding:10px; text-align:left;">Status</th>
                            <th style="padding:10px; text-align:left;">Assigned Date</th>
                            <th style="padding:10px; text-align:center;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lawyerCases.map((c, index) => `
                            <tr style="${index % 2 === 0 ? 'background:#f9f9f9;' : ''}">
                                <td style="padding:10px; font-weight:bold;">${escapeHtml(c.caseId || 'N/A')}</td>
                                <td style="padding:10px;">${escapeHtml(c.caseType || 'N/A')}</td>
                                <td style="padding:10px;">${escapeHtml(c.citizen || 'N/A')}</td>
                                <td style="padding:10px;">
                                    ${c.status === 'Resolved' ? 
                                        '<span class="badge badge-resolved">Resolved</span>' : 
                                        (c.status === 'Accepted by Lawyer' ? 
                                        '<span class="badge badge-lawyer">In Progress</span>' : 
                                        '<span class="badge badge-pending">Pending</span>')}
                                </td>
                                <td style="padding:10px; font-size:13px; color:#666;">${escapeHtml(c.acceptedDate || 'N/A')}</td>
                                <td style="padding:10px; text-align:center;">
                                    <button onclick="viewCase(${escapeHtml(JSON.stringify(String(c.caseId)))})" style="padding:5px 12px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:4px; cursor:pointer;">View</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`}
            
            <div style="margin-top:25px; display:flex; gap:10px; flex-wrap:wrap;">
                <button onclick="showLawyerManagement()" class="btn" style="background:#28a745; color:white;">Manage Lawyer</button>
            </div>
        </div>
    `;
    
    openDynamicView(html);
}

async function createLegalAlert() {
    const title = document.getElementById('alertTitle').value.trim();
    const category = document.getElementById('alertCategory').value;
    const summary = document.getElementById('alertSummary').value.trim();
    const content = document.getElementById('alertContent').value.trim();
    const priority = document.getElementById('alertPriority').value;
    const audience = document.getElementById('alertAudience').value;
    
    if (!title) {
        showToast('Please enter an alert title.');
        document.getElementById('alertTitle').focus();
        return;
    }
    if (!summary) {
        showToast('Please enter a summary.');
        document.getElementById('alertSummary').focus();
        return;
    }

    const createdBy = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || 'admin';
    const combinedContent = summary + (content ? ('\n\n' + content) : '');

    try {
        const resp = await fetch(API_ENDPOINTS.legalAlertsAPI, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ title, content: combinedContent, category, priority, audience, createdBy })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || data.success === false) {
            showToast('Failed to publish alert: ' + (data.error || resp.statusText));
            return;
        }

        document.getElementById('alertTitle').value = '';
        document.getElementById('alertSummary').value = '';
        document.getElementById('alertContent').value = '';

        await _lcdjpRefreshLegalAlerts();
        const listContainer = document.getElementById('alertsListContainer');
        if (listContainer) {
            listContainer.innerHTML = renderAlertsList();
        }

        showToast('Alert published successfully!');
    } catch (e) {
        showToast('Failed to publish alert. Please try again.');
    }
}

function showLegalAlertsManager() {
    const dynPage = document.getElementById('dynamicFormPage');
    if (dynPage) {
        dynPage.innerHTML = '';
        dynPage.style.display = 'none';
    }
    
    hideAllDashboardViews();
    const adminDashboard = document.getElementById("adminDashboard");
    if (adminDashboard) {
        adminDashboard.style.display = "block";
    }
    
    const containers = [
        'adminHomeContainer', 'approvalContainer', 'userManagementContainer',
        'lawyerManagementContainer', 'lawyerPerformanceContainer',
        'pdfExportContainer', 'statisticsContainer', 'searchResultsContainer'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    let html = `
        <div style="background:white; border-radius:12px; padding:25px; box-shadow:0 2px 10px rgba(0,0,0,0.08); max-width:800px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid #1a4080; padding-bottom:15px;">
                <h2 style="color:#1a4080; margin:0;"> Legal Alerts Manager</h2>
                <button onclick="showAdminHome()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
            </div>
            
            
            <div style="background:#f0f5ff; padding:20px; border-radius:10px; margin-bottom:25px; border:1px solid #cfe0ff;">
                <h3 style="color:#1a4080; margin-bottom:15px;"> Create New Alert</h3>
                
                <label style="font-weight:600; display:block; margin-top:10px;">Alert Title <span style="color:red;">*</span></label>
                <input type="text" id="alertTitle" placeholder="Alert title"
                       style="width:100%; padding:12px; border:1px solid #ccc; border-radius:6px; font-size:14px;">
                
                <label style="font-weight:600; display:block; margin-top:10px;">Category <span style="color:red;">*</span></label>
                <select id="alertCategory" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:6px; font-size:14px;">
                    <option value="New Law"> New Law</option>
                    <option value="Court Ruling"> Court Ruling</option>
                    <option value="Legal Tip"> Legal Tip</option>
                    <option value="Rights Awareness"> Rights Awareness</option>
                    <option value="Deadline"> Deadline</option>
                    <option value="Court Holiday"> Court Holiday</option>
                    <option value="System Update"> System Update</option>
                    <option value="Urgent"> Urgent</option>
                    <option value="General"> General</option>
                </select>
                
                <label style="font-weight:600; display:block; margin-top:10px;">Summary <span style="color:red;">*</span></label>
                <textarea id="alertSummary" rows="2" placeholder="Brief summary of the alert (2-3 sentences)" 
                          style="width:100%; padding:12px; border:1px solid #ccc; border-radius:6px; font-size:14px; resize:vertical;"></textarea>
                
                <label style="font-weight:600; display:block; margin-top:10px;">Full Content (Optional)</label>
                <textarea id="alertContent" rows="4" placeholder="Detailed information about the alert..." 
                          style="width:100%; padding:12px; border:1px solid #ccc; border-radius:6px; font-size:14px; resize:vertical;"></textarea>
                
                <label style="font-weight:600; display:block; margin-top:10px;">Priority <span style="color:red;">*</span></label>
                <select id="alertPriority" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:6px; font-size:14px;">
                    <option value="low"> Low</option>
                    <option value="medium" selected> Medium</option>
                    <option value="high"> High</option>
                    <option value="urgent"> Urgent</option>
                </select>
                
                <label style="font-weight:600; display:block; margin-top:10px;">Target Audience</label>
                <select id="alertAudience" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:6px; font-size:14px;">
                    <option value="all"> All Users</option>
                    <option value="citizens"> Citizens Only</option>
                    <option value="lawyers"> Lawyers Only</option>
                    <option value="admins"> Admins Only</option>
                </select>
                
                <button onclick="createLegalAlert()" 
                        style="margin-top:15px; width:100%; padding:14px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:16px;">
                     Publish Alert
                </button>
            </div>
            
            
            <div>
                <h3 style="color:#1a4080; margin-bottom:15px;"> Existing Alerts (${escapeHtml(legalAlerts.length)})</h3>
                <div id="alertsListContainer">
                    ${renderAlertsList()}
                </div>
            </div>
        </div>
    `;
    
    openDynamicView(html);
}
function renderAlertsList() {
    if (legalAlerts.length === 0) {
        return `<div style="text-align:center; padding:30px; color:#999;">No alerts created yet.</div>`;
    }

    const priorityColors = {
        low: '#28a745',
        medium: '#ff9800',
        high: '#ff5722',
        urgent: '#dc3545'
    };
    const priorityLabels = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'URGENT'
    };

    const getCreatedAt = (a) => a.createdAt || a.created_at;
    const getSummary = (a) => {
        if (a.summary) return a.summary;
        const content = a.content || '';
        return content.length > 140 ? content.slice(0, 140).trim() + '…' : content;
    };

    const sorted = [...legalAlerts].sort((a, b) => new Date(getCreatedAt(b)) - new Date(getCreatedAt(a)));

    let html = '';
    sorted.forEach(alert => {
        const esc = (typeof _cmEsc === 'function') ? _cmEsc : (v => v);
        const title = esc(alert.title || '');
        const summary = esc(getSummary(alert));
        const category = esc(alert.category || '');
        const audience = esc(alert.audience || '');
        const createdAt = getCreatedAt(alert);
        const idAttr = esc(String(alert.id));

        html += `
            <div style="background:${alert.priority === 'urgent' ? '#fff5f5' : '#f8f9fa'}; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid ${priorityColors[alert.priority] || '#1a4080'};">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                        <div style="font-weight:bold; color:#333;">${title}</div>
                        <div style="font-size:12px; color:#888;">
                            <span style="background:${priorityColors[alert.priority] || '#1a4080'}; color:white; padding:2px 10px; border-radius:10px; font-size:10px;">
                                ${priorityLabels[alert.priority] || 'Normal'}
                            </span>
                            ${category ? ` • ${category}` : ''}
                            ${audience && audience !== 'all' ? ` •  ${audience}` : ''}
                        </div>
                        <div style="font-size:13px; color:#555; margin-top:4px;">${summary}</div>
                    </div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                        <button class="lcdjp-delete-alert-btn" data-alert-id="${idAttr}"
                                style="padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">
                             Delete
                        </button>
                    </div>
                </div>
                <div style="font-size:11px; color:#999; margin-top:5px;"> ${createdAt ? new Date(createdAt).toLocaleString() : ''}</div>
            </div>
        `;
    });

    return html;
}

async function deleteLegalAlert(alertId) {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
        const resp = await fetch(`${API_ENDPOINTS.legalAlertsAPI}/${alertId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || data.success === false) {
            showToast('Failed to delete alert: ' + (data.error || resp.statusText));
            return;
        }

        await _lcdjpRefreshLegalAlerts();
        const listContainer = document.getElementById('alertsListContainer');
        if (listContainer) listContainer.innerHTML = renderAlertsList();
        showToast('Alert deleted successfully.');
    } catch (e) {
        showToast('Failed to delete alert. Please try again.');
    }
}

function sendAlertNotifications(alert) {
    let notifications = _lcdjpStore.notifications;
    let targetUsers = [];
    
    for (const _lsKey of Object.keys(_lcdjp_user_index)) {
        const key = _lsKey;
        if (key && key.startsWith('user_')) {
            const user = (_lcdjp_user_index[key] || {});
            let include = false;
            
            if (alert.audience === 'all') include = true;
            else if (alert.audience === 'citizens' && user.userType === 'Citizen') include = true;
            else if (alert.audience === 'lawyers' && user.userType === 'Lawyer') include = true;
            else if (alert.audience === 'admins' && (user.userType === 'Admin' || user.userType === 'System Administrator' || user.userType === 'SYSTEM_ADMIN')) include = true;
            
            if (include) {
                targetUsers.push(user.username);
            }
        }
    }
    
    targetUsers.forEach(username => {
        const priorityEmoji = {
            low: '',
            medium: '',
            high: '',
            urgent: ''
        };
        
        _lcdjpCreateNotification(
            username,
            `${priorityEmoji[alert.priority] || ''} ${alert.title}: ${alert.summary}`,
            'legal_alert',
            alert.id
        );
    });
    renderNavbarNotifBadge();
    console.log(`Alert sent to ${targetUsers.length} users`);
}


function _lcdjpAppInit() {
    let profilePic = document.getElementById("profilePicture");
    
    let username = sessionStorage.getItem("lcdjp_username");
    if (username) {
        let savedAvatar = sessionStorage.getItem("lcdjp_avatar_" + username);
        if (savedAvatar && savedAvatar !== "undefined" && savedAvatar !== "null") {
            if (profilePic) profilePic.src = savedAvatar;
        } else {
            if (profilePic) profilePic.src = defaultAvatar;
        }
    } else {
        if (profilePic) profilePic.src = defaultAvatar;
    }
    
    if (Notification && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    let savedUserLevel = sessionStorage.getItem("lcdjp_userlevel");
    let savedUsername = sessionStorage.getItem("lcdjp_username");
    let savedFullname = sessionStorage.getItem("lcdjp_fullname");
    
    if (savedUserLevel && savedUsername) {
        currentUserLevel = savedUserLevel;

        
        
        
        
        window.LCDJP_AUTH_VALIDATED = true;
        window.LCDJP_AUTH_READY = true;
        if (typeof _cmActivate === 'function') _cmActivate();

        if (savedUserLevel === "Lawyer") {
            currentLawyerSpecialization = sessionStorage.getItem("lcdjp_lawyer_specialization") || "";
        }
        
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("dashboardPage").style.display = "block";
        
        
        if (savedUserLevel === "DISTRICT_ADMIN") {
            currentUserLevel = "DISTRICT_ADMIN";
            setupDashboardMenuVisibility("DISTRICT_ADMIN");
            var _daAdminSBOL = document.getElementById("adminSidebarMenu");
            if (_daAdminSBOL) _daAdminSBOL.style.display = "none";
            var _daSBOL = document.getElementById("daSidebarMenu");
            if (_daSBOL) { _daSBOL.style.display = "block"; _daSBOL.style.visibility = "visible"; }
            var _cSBOL = document.getElementById("citizenSidebarMenu");
            if (_cSBOL) _cSBOL.style.display = "none";
            var _lSBOL = document.getElementById("lawyerSidebarMenu");
            if (_lSBOL) _lSBOL.style.display = "none";
            document.body.classList.add("admin-dashboard-mode");
            renderNavbarNotifBadge();
            if (typeof showDistrictAdminDashboard === "function") showDistrictAdminDashboard();
        }
        
        else if (isAdmin(savedUserLevel)) {
            document.body.classList.remove('citizen-dashboard-mode', 'lawyer-dashboard-mode');
            document.body.classList.add('admin-dashboard-mode');
            setupDashboardMenuVisibility(savedUserLevel);
            renderNavbarNotifBadge();
            showAdminHome();
        }
        else if (savedUserLevel === "Citizen") {
            setupDashboardMenuVisibility("Citizen");
            let displayName = savedFullname || savedUsername;
            var _el_welcomeU=document.getElementById("welcomeUserHeading"); if(_el_welcomeU) document.getElementById("welcomeUserHeading").innerHTML = "Welcome " + displayName;
            var _el_accountM=document.getElementById("accountMenuDropdownLabel"); if(_el_accountM) document.getElementById("accountMenuDropdownLabel").innerHTML = displayName + "";
            renderNavbarNotifBadge();
            showHome();
            if (typeof syncCdtUserInfo === 'function') syncCdtUserInfo();
        }
        else if (savedUserLevel === "Lawyer") {
            setupDashboardMenuVisibility("Lawyer");
            var _el_accountM=document.getElementById("accountMenuDropdownLabel"); if(_el_accountM) document.getElementById("accountMenuDropdownLabel").innerHTML = "Lawyer Desk";
            renderNavbarNotifBadge();
            showHome();
        }
        else if (savedUserLevel === "LC" || savedUserLevel === "LC1" || savedUserLevel === "LC2" || savedUserLevel === "LC3") {
            setupDashboardMenuVisibility("LC");
            var _el_accountM=document.getElementById("accountMenuDropdownLabel"); if(_el_accountM) document.getElementById("accountMenuDropdownLabel").innerHTML = "LC Official";
            renderNavbarNotifBadge();
            showLcDashboard();
        }
        else {
            
            var _lsToken2 = (typeof getAuthToken === 'function' ? getAuthToken() : null);
            if (_lsToken2) {
                checkAuthStatus();
            } else {
                if (typeof showLoginScreen === 'function') showLoginScreen();
            }
        }
    } else {
        
        var _lsToken = (typeof getAuthToken === 'function' ? getAuthToken() : null);
        var _lsUsername = localStorage.getItem("username");
        if (_lsToken && _lsUsername) {
            checkAuthStatus();
        } else {
            if (typeof showLoginScreen === 'function') showLoginScreen();
        }
    }
    const userLevel = sessionStorage.getItem('lcdjp_userlevel');
    if (userLevel && document.getElementById('homePage') && 
        document.getElementById('homePage').style.display !== 'none') {
        setTimeout(typeWelcomeMessage, 500);
    }
    addAPIStatusIndicator();
    
    const syncQueue = []; 
    if (syncQueue.length > 0) {
        console.log(`${syncQueue.length} items pending sync`);
        setTimeout(function() {
            if (typeof updateSyncQueueBadge === 'function') updateSyncQueueBadge();
        }, 1000);
    }
    
    
    const token = getAuthToken();
    const currentUsername = sessionStorage.getItem("lcdjp_username") ||
        localStorage.getItem("lcdjp_username");
    
    
    if (token && currentUsername && isAuthenticated()) {
        startNotificationPolling();
    }
}







if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _lcdjpAppInit);
} else {
    _lcdjpAppInit();
}

var searchTimeout = null;
function handleUniversalSearch(event) {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    const query = event.target.value.trim();
    
    if (query.length === 0) {
        document.getElementById('searchSuggestions').style.display = 'none';
        return;
    }
    
    searchTimeout = setTimeout(() => {
        showSearchSuggestions(query);
    }, 300);
}

function showSearchSuggestions(query) {
    const results = performSearch(query);
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!suggestionsContainer) return;
    
    if (results.length === 0) {
        suggestionsContainer.innerHTML = `
            <div style="padding:15px; color:#999; text-align:center;">
                No results found for "<strong>${(typeof _cmEsc === 'function') ? _cmEsc(query) : query}</strong>"
            </div>
        `;
        suggestionsContainer.style.display = 'block';
        return;
    }
    
    let html = '';
    const topResults = results.slice(0, 5);
    topResults.forEach(result => {
        const esc = (typeof _cmEsc === 'function') ? _cmEsc : (v => v);
        const icon = result.type === 'case' ? '' : 
                     result.type === 'user' ? '' : 
                     result.type === 'lawyer' ? '' : 
                     result.type === 'subscription' ? '' : '';
        const title = esc(result.title || '');
        const subtitle = esc(result.subtitle || '');
        const type = esc(result.type || '');
        const idAttr = esc(String(result.id));
        
        html += `
            <div class="lcdjp-search-result-item" data-result-id="${idAttr}"
                 style="padding:10px 15px; border-bottom:1px solid #eee; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:0.2s;"
                 onmouseover="this.style.background='#f0f5ff'"
                 onmouseout="this.style.background='white'">
                <div>
                    <div style="font-weight:bold; color:#1a4080;">${icon} ${title}</div>
                    <div style="font-size:12px; color:#888;">${subtitle}</div>
                </div>
                <div style="font-size:11px; color:#999; background:#f0f0f0; padding:2px 10px; border-radius:12px;">${type}</div>
            </div>
        `;
    });
    
    if (results.length > 5) {
        html += `
            <div style="padding:10px 15px; text-align:center; color:#1a4080; font-weight:bold; cursor:pointer; border-top:1px solid #eee;"
                 onclick="performSearchAndShowAll(${escapeHtml(JSON.stringify(query))})">
                View all ${escapeHtml(results.length)} results →
            </div>
        `;
    }
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
}

function performSearch(query) {
    const results = [];
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) return results;
    
    const allCases = _lcdjpStore.cases;
    allCases.forEach(c => {
        const searchable = [
            c.caseId,
            c.oldCaseId,
            c.caseType,
            c.citizen,
            c.citizenUsername,
            c.citizenPhone,
            c.citizenEmail,
            c.kinName,
            c.kinPhone,
            c.village,
            c.parish,
            c.district,
            c.assignedLawyer,
            c.assignedLawyerName,
            c.status,
            c.description
        ].map(s => (s || '').toLowerCase());
        
        if (searchable.some(s => s.includes(lowerQuery))) {
            results.push({
                id: c.caseId,
                type: 'case',
                title: `${c.caseId} - ${c.caseType}`,
                subtitle: `${c.citizen} | ${c.citizenPhone || 'No phone'} | ${c.status}`,
                data: c
            });
        }
    });
    
    for (const _lsKey of Object.keys(_lcdjp_user_index)) {
        const key = _lsKey;
        if (key && key.startsWith('user_')) {
            const user = (_lcdjp_user_index[key] || {});
            const searchable = [
                user.userId,
                user.username,
                user.firstName,
                user.lastName,
                user.phoneNumber,
                user.nationalId,
                user.email,
                user.userType,
                user.district,
                user.village,
                user.lawyerSpecialization,
                user.lawFirmName,
                user.lcLevel,
                user.lcPosition
            ].map(s => (s || '').toLowerCase());
            
            if (searchable.some(s => s.includes(lowerQuery))) {
                const userType = user.userType || 'User';
                const icon = userType === 'Citizen' ? '' : 
                             userType === 'Lawyer' ? '' : '';
                results.push({
                    id: user.username,
                    type: 'user',
                    title: `${icon} ${user.firstName} ${user.lastName}`,
                    subtitle: `${user.userType} | ${user.phoneNumber || 'No phone'} | ${user.userId || 'No ID'}`,
                    data: user
                });
            }
        }
    }
    
    const subscriptions = JSON.parse(sessionStorage.getItem('lcdjp_subscriptions')) || {};
    Object.keys(subscriptions).forEach(username => {
        const sub = subscriptions[username];
        const searchable = [
            sub.subscriptionId,
            sub.transactionRef,
            username,
            sub.paymentMethod,
            sub.phoneNumber,
            sub.status
        ].map(s => (s || '').toLowerCase());
        
        if (searchable.some(s => s.includes(lowerQuery))) {
            results.push({
                id: `sub_${username}`,
                type: 'subscription',
                title: ` Subscription: ${username}`,
                subtitle: `${sub.subscriptionId || 'No ID'} | ${sub.status || 'Unknown'} | ${sub.paymentMethod || 'N/A'}`,
                data: { username, subscription: sub }
            });
        }
    });
    
    const notifications = _lcdjpStore.notifications;
    notifications.forEach(n => {
        const searchable = [
            n.notificationId,
            n.message,
            n.username,
            n.caseId
        ].map(s => (s || '').toLowerCase());
        
        if (searchable.some(s => s.includes(lowerQuery))) {
            results.push({
                id: n.notificationId || n.id,
                type: 'notification',
                title: ` ${n.message.substring(0, 50)}${n.message.length > 50 ? '...' : ''}`,
                subtitle: `To: ${n.username} | ${new Date(n.timestamp).toLocaleDateString()}`,
                data: n
            });
        }
    });
    
    return results;
}

function performSearchAndShowAll(query) {
    document.getElementById('searchSuggestions').style.display = 'none';
    document.getElementById('universalSearchInput').value = query;
    performUniversalSearch();
}

function performUniversalSearch() {
    const query = document.getElementById('universalSearchInput').value.trim();
    if (!query) {
        alert('Please enter a search term.');
        return;
    }
    
    const results = performSearch(query);
    showSearchResults(query, results);
}

function showSearchResults(query, results) {
    const container = document.getElementById('searchResultsContainer');
    const content = document.getElementById('searchResultsContent');
    
    if (!container || !content) {
        console.error('Search containers not found');
        return;
    }

    hideAllDashboardViews();
    const _adminDashSR = document.getElementById('adminDashboard');
    if (_adminDashSR) _adminDashSR.style.display = 'block';
    
    const suggestions = document.getElementById('searchSuggestions');
    if (suggestions) suggestions.style.display = 'none';
    
    container.style.display = 'block';
    
    if (results.length === 0) {
        content.innerHTML = `
            <div style="background:white; padding:40px; border-radius:12px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                <div style="font-size:64px; margin-bottom:15px;"></div>
                <h3 style="color:#1a4080;">No Results Found</h3>
                <p style="color:#666;">No records found matching "<strong>${escapeHtml(query)}</strong>"</p>
                <p style="color:#999; font-size:13px;">Try searching by Case ID, User ID, Phone, Name, National ID, or Transaction Reference</p>
            </div>
        `;
        return;
    }
    
    const grouped = {
        cases: results.filter(r => r.type === 'case'),
        users: results.filter(r => r.type === 'user'),
        subscriptions: results.filter(r => r.type === 'subscription'),
        notifications: results.filter(r => r.type === 'notification')
    };
    
    let html = `
        <div style="background:white; border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                <div>
                    <h3 style="color:#1a4080; margin:0;"> Search Results</h3>
                    <p style="color:#666; margin:5px 0 0 0; font-size:13px;">Found ${escapeHtml(results.length)} result(s) for "<strong>${escapeHtml(query)}</strong>"</p>
                </div>
            </div>
            
            ${grouped.cases.length > 0 ? `
                <div style="margin-bottom:20px;">
                    <h4 style="color:#1a4080; border-bottom:2px solid #1a4080; padding-bottom:8px;"> Cases (${escapeHtml(grouped.cases.length)})</h4>
                    ${grouped.cases.map(c => `
                        <div style="background:#f0f5ff; padding:12px 15px; border-radius:6px; margin-bottom:8px; border-left:4px solid #1a4080; cursor:pointer;" 
                             onclick="viewSearchResult(${escapeHtml(JSON.stringify(String(c.id)))})">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                                <div>
                                    <strong>${escapeHtml(c.id)}</strong> - ${escapeHtml(c.data.caseType)}
                                    <div style="font-size:13px; color:#666;">${escapeHtml(c.data.citizen)} | ${escapeHtml(c.data.citizenPhone || 'No phone')}</div>
                                </div>
                                <div>
                                    <span style="background:${c.data.status === 'Resolved' ? '#d4edda' : '#ffeacc'}; padding:3px 12px; border-radius:12px; font-size:12px;">
                                        ${escapeHtml(c.data.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${grouped.users.length > 0 ? `
                <div style="margin-bottom:20px;">
                    <h4 style="color:#17a2b8; border-bottom:2px solid #17a2b8; padding-bottom:8px;"> Users (${escapeHtml(grouped.users.length)})</h4>
                    ${grouped.users.map(u => `
                        <div style="background:#f0f8ff; padding:12px 15px; border-radius:6px; margin-bottom:8px; border-left:4px solid #17a2b8; cursor:pointer;" 
                             onclick="viewSearchResult(${escapeHtml(JSON.stringify(String(u.id)))})">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                                <div>
                                    <strong>${escapeHtml(u.data.firstName)} ${escapeHtml(u.data.lastName)}</strong>
                                    <div style="font-size:13px; color:#666;">${escapeHtml(u.data.userType)} | ${escapeHtml(u.data.phoneNumber || 'No phone')} | ${escapeHtml(u.data.userId || 'No ID')}</div>
                                </div>
                                <div>
                                    <span style="background:${u.data.approvalStatus === 'Approved' ? '#d4edda' : '#ffeacc'}; padding:3px 12px; border-radius:12px; font-size:12px;">
                                        ${escapeHtml(u.data.approvalStatus)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${grouped.subscriptions.length > 0 ? `
                <div style="margin-bottom:20px;">
                    <h4 style="color:#28a745; border-bottom:2px solid #28a745; padding-bottom:8px;"> Subscriptions (${escapeHtml(grouped.subscriptions.length)})</h4>
                    ${grouped.subscriptions.map(s => `
                        <div style="background:#e8f5e9; padding:12px 15px; border-radius:6px; margin-bottom:8px; border-left:4px solid #28a745; cursor:pointer;" 
                             onclick="viewSearchResult(${escapeHtml(JSON.stringify(String(s.id)))})">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                                <div>
                                    <strong>${escapeHtml(s.data.username)}</strong>
                                    <div style="font-size:13px; color:#666;">${escapeHtml(s.data.subscription.subscriptionId || 'No ID')} | ${escapeHtml(s.data.subscription.paymentMethod || 'N/A')}</div>
                                </div>
                                <div>
                                    <span style="background:${s.data.subscription.status === 'active' ? '#d4edda' : '#ffeacc'}; padding:3px 12px; border-radius:12px; font-size:12px;">
                                        ${escapeHtml(s.data.subscription.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${grouped.notifications.length > 0 ? `
                <div style="margin-bottom:20px;">
                    <h4 style="color:#ff9800; border-bottom:2px solid #ff9800; padding-bottom:8px;"> Notifications (${escapeHtml(grouped.notifications.length)})</h4>
                    ${grouped.notifications.map(n => `
                        <div style="background:#fff8e1; padding:12px 15px; border-radius:6px; margin-bottom:8px; border-left:4px solid #ff9800; cursor:pointer;"
                             onclick="viewSearchResult(${escapeHtml(JSON.stringify(String(n.id)))})">
                            <div style="font-size:13px;">${escapeHtml(n.data.message)}</div>
                            <div style="font-size:12px; color:#888;">To: ${escapeHtml(n.data.username)} | ${new Date(n.data.timestamp).toLocaleString()}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    content.innerHTML = html;
    
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function viewSearchResult(id) {
    const allCases = _lcdjpStore.cases;
    const foundCase = allCases.find(c => c.caseId === id);
    if (foundCase) {
        viewCase(id);
        return;
    }
    
    for (const _lsKey of Object.keys(_lcdjp_user_index)) {
        const key = _lsKey;
        if (key && key.startsWith('user_')) {
            const user = (_lcdjp_user_index[key] || {});
            if (user.username === id || user.userId === id) {
                viewUserDetails(user.username);
                return;
            }
        }
    }
    
    const subscriptions = JSON.parse(sessionStorage.getItem('lcdjp_subscriptions')) || {};
    if (id.startsWith('sub_')) {
        const username = id.replace('sub_', '');
        if (subscriptions[username]) {
            viewSubscriptionDetails(username);
            return;
        }
    }

    const notifications = _lcdjpStore.notifications || [];
    const foundNotification = notifications.find(n => String(n.notificationId || n.id) === String(id));
    if (foundNotification && typeof goToNotificationFromSearch === 'function') {
        goToNotificationFromSearch(foundNotification.notificationId || foundNotification.id);
        return;
    }
    
    alert('Details not found for this ID.');
}

function viewSubscriptionDetails(username) {
    const subscription = getLawyerSubscription(username);
    if (!subscription) {
        alert('Subscription not found.');
        return;
    }
    
    let html = `
        <div class="form-card" style="max-width:700px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="color:#1a4080; margin:0;"> Subscription Details</h2>
                <button onclick="clearSearch()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
            </div>
            <div class="lcdjp-grid-2col" style="gap:15px; margin-top:20px;">
                <div><strong>Lawyer:</strong> ${escapeHtml(username)}</div>
                <div><strong>Subscription ID:</strong> ${escapeHtml(subscription.subscriptionId || 'N/A')}</div>
                <div><strong>Transaction Ref:</strong> ${escapeHtml(subscription.transactionRef || 'N/A')}</div>
                <div><strong>Status:</strong> <span style="color:${subscription.status === 'active' ? '#28a745' : '#dc3545'};">${escapeHtml(subscription.status)}</span></div>
                <div><strong>Payment Method:</strong> ${escapeHtml(subscription.paymentMethod || 'N/A')}</div>
                <div><strong>Phone:</strong> ${escapeHtml(subscription.phoneNumber || 'N/A')}</div>
                <div><strong>Amount:</strong> UGX ${escapeHtml(subscription.amount || '50,000')}</div>
                <div><strong>Start Date:</strong> ${new Date(subscription.startDate).toLocaleString()}</div>
                <div><strong>Payment Date:</strong> ${new Date(subscription.paymentDate).toLocaleString()}</div>
                <div><strong>Days Remaining:</strong> ${getSubscriptionDaysRemaining(username)} days</div>
            </div>
        </div>
    `;
    
    openDynamicView(html);
}

function clearSearch() {
    const searchInput = document.getElementById('universalSearchInput');
    if (searchInput) searchInput.value = '';
    
    const resultsContainer = document.getElementById('searchResultsContainer');
    if (resultsContainer) resultsContainer.style.display = 'none';
    
    const resultsContent = document.getElementById('searchResultsContent');
    if (resultsContent) resultsContent.innerHTML = '';
    
    const suggestions = document.getElementById('searchSuggestions');
    if (suggestions) suggestions.style.display = 'none';
    
    showAdminHome();
    
    const dynamicView = document.getElementById('dynamicFormPage');
    if (dynamicView) {
        dynamicView.innerHTML = '';
        dynamicView.style.display = 'none';
    }
}
document.addEventListener('click', function(e) {
    const deleteBtn = e.target.closest('.lcdjp-delete-alert-btn');
    if (deleteBtn) {
        deleteLegalAlert(deleteBtn.getAttribute('data-alert-id'));
        return;
    }

    const resultItem = e.target.closest('.lcdjp-search-result-item');
    if (resultItem) {
        viewSearchResult(resultItem.getAttribute('data-result-id'));
    }
});
