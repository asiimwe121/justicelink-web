
function showPDFExport() {
    hideAllDashboardViews();
    
    const adminDashboard = document.getElementById("adminDashboard");
    if (!adminDashboard) {
        console.error("adminDashboard not found");
        return;
    }
    adminDashboard.style.display = "block";

    ['adminHomeContainer','approvalContainer','userManagementContainer','lawyerManagementContainer',
     'lawyerPerformanceContainer','statisticsContainer','searchResultsContainer'].forEach(function(id){
        const el = document.getElementById(id); 
        if (el) el.style.display = 'none';
    });
    
    setAdminActiveMenu('pdf');
    
    
    
    
    let container = document.getElementById('pdfExportContainer');
    
    if (!container) {
        console.warn('pdfExportContainer not found, creating it...');
        container = document.createElement('div');
        container.id = 'pdfExportContainer';
        container.style.display = 'block';
        adminDashboard.appendChild(container);
    } else {
        container.style.display = 'block';
    }
    
    const preview = document.getElementById('reportPreview');
    if (preview) {
        preview.style.display = 'none';
        const content = document.getElementById('reportPreviewContent');
        if (content) content.innerHTML = '';
    }
    
    const reportType = document.getElementById('reportType');
    if (reportType) reportType.value = '';
    
    const filterContainer = document.getElementById('filterContainer');
    if (filterContainer) filterContainer.style.display = 'none';
    
    let districts = [];
    if (typeof ugandaDistricts !== 'undefined' && ugandaDistricts.length > 0) {
        districts = ugandaDistricts;
    } else {
        districts = [
            "Kampala", "Wakiso", "Mukono", "Gulu", "Jinja", "Mbarara", 
            "Masaka", "Mbale", "Lira", "Soroti", "Arua", "Kabale",
            "Fort Portal", "Entebbe", "Tororo", "Busia", "Hoima", "Kasese"
        ];
    }
    
    let lawyers = getAllLawyers();
    
    let html = `
        <div style="background:white; border-radius:12px; padding:25px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 style="color:#1a4080; margin:0;"> Export Reports</h2>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button onclick="exportReportCSV()" class="btn" style="width:auto; padding:10px 20px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer;">
                         Export CSV
                    </button>
                    <button onclick="closePDFExport()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
                </div>
            </div>
            <p style="color:#666; margin-bottom:20px;">Generate detailed reports with custom filters</p>
            
            
            <div style="background:#f0f5ff; padding:15px; border-radius:8px; margin-bottom:20px; border-left:4px solid #1a4080;">
                <label style="font-weight:600; display:block; margin-bottom:8px;">Report Type <span style="color:red;">*</span></label>
                <select id="reportType" onchange="updateReportFilters()" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;">
                    <option value="">-- Select Report Type --</option>
                    <option value="all_cases"> All Cases</option>
                    <option value="cases_by_lawyer"> Cases by Lawyer</option>
                    <option value="cases_by_district"> Cases by District</option>
                    <option value="cases_by_village"> Cases by Village</option>
                    <option value="cases_by_status"> Cases by Status</option>
                    <option value="single_case"> Single Case Details</option>
                    <option value="lawyer_performance"> Lawyer Performance Report</option>
                    <option value="subscription_report"> Subscription Report</option>
                    <option value="user_report"> User Registration Report</option>
                </select>
            </div>
            
            
            <div id="filterContainer" style="display:none; background:#f0f8ff; padding:15px; border-radius:8px; margin-bottom:20px; border-left:4px solid #007bff;">
                <h4 style="color:#007bff; margin-bottom:10px;"> Filters</h4>
                <div id="dynamicFilters"></div>
            </div>
            
            
            <div class="lcdjp-grid-2col" style="gap:15px; margin-bottom:20px;">
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:5px;">From Date</label>
                    <input type="date" id="reportFromDate" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;">
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:5px;">To Date</label>
                    <input type="date" id="reportToDate" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;">
                </div>
            </div>
            
            
            <button onclick="generatePDFReport()" class="btn login-btn" 
                    style="width:100%; padding:16px; background:#dc3545; color:white; border:none; border-radius:8px; font-size:18px; cursor:pointer; font-weight:bold;">
                 Generate PDF Report
            </button>
            
            
            <div id="reportPreview" style="margin-top:20px; display:none;">
                <h4 style="color:#1a4080;"> Report Preview</h4>
                <div id="reportPreviewContent" style="background:#f9f9f9; padding:15px; border-radius:8px; max-height:400px; overflow-y:auto; border:1px solid #ddd;"></div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const fromDateInput = document.getElementById('reportFromDate');
    const toDateInput = document.getElementById('reportToDate');
    if (fromDateInput) fromDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    if (toDateInput) toDateInput.value = today.toISOString().split('T')[0];
}




function _reportIsDistrictAdmin() {
    return (sessionStorage.getItem('lcdjp_userlevel') || '') === 'DISTRICT_ADMIN';
}

function _reportOwnDistrict() {
    return sessionStorage.getItem('lcdjp_district') || '';
}





function _reportFilterCasesByLocationAndDate(cases) {
    let result = cases;

    const districtFilter = document.getElementById('reportDistrictFilter')?.value ||
                            document.getElementById('reportDistrictSearch')?.value || '';
    const countyFilter = document.getElementById('reportCountyFilter')?.value ||
                          document.getElementById('reportCountySearch')?.value || '';
    const subCountyFilter = document.getElementById('reportSubCountyFilter')?.value ||
                             document.getElementById('reportSubCountySearch')?.value || '';

    if (districtFilter) {
        result = result.filter(c =>
            c.district === districtFilter ||
            c.districtDisplay === districtFilter ||
            c.districtRaw === districtFilter ||
            (c.locationKeys && c.locationKeys.district === districtFilter)
        );
    }
    if (countyFilter) {
        result = result.filter(c =>
            c.county === countyFilter ||
            c.countyDisplay === countyFilter ||
            c.countyRaw === countyFilter ||
            (c.locationKeys && c.locationKeys.county === countyFilter)
        );
    }
    if (subCountyFilter) {
        result = result.filter(c =>
            c.subCounty === subCountyFilter ||
            c.subCountyDisplay === subCountyFilter ||
            c.subCountyRaw === subCountyFilter ||
            (c.locationKeys && c.locationKeys.subCounty === subCountyFilter)
        );
    }

    const fromDate = document.getElementById('reportFromDate')?.value;
    const toDate = document.getElementById('reportToDate')?.value;
    if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        result = result.filter(c => {
            const caseDate = new Date(c.submissionDate || c.created_at || c.registrationDate || c.timestamp);
            return !isNaN(caseDate) && caseDate >= from && caseDate <= to;
        });
    }

    return result;
}

async function exportCasesToCSV() {
    try {
        const userLevel = sessionStorage.getItem('lcdjp_userlevel');
        const username = sessionStorage.getItem('lcdjp_username');
        
        if (!username) {
            alert('Please login first');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            alert('Authentication token not found');
            return;
        }

        if (!isAdmin(userLevel) && typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
            if (typeof showFeatureUnavailableMessage === 'function') {
                showFeatureUnavailableMessage('Case export is not available at this time.');
            }
            return;
        }

        let casesToExport = [];

        if (userLevel === 'Citizen') {
            
            
            
            const myCasesResponse = await fetch(API_ENDPOINTS.citizenCases(username), {
                headers: getAuthHeaders()
            });

            if (!myCasesResponse.ok) {
                throw new Error('Failed to fetch your cases');
            }

            const myCasesData = await myCasesResponse.json();
            casesToExport = (myCasesData && myCasesData.cases) ? myCasesData.cases : [];
        } else {
            const casesResponse = await fetch(API_ENDPOINTS.cases, {
                headers: getAuthHeaders()
            });

            if (!casesResponse.ok) {
                throw new Error('Failed to fetch cases');
            }

            const casesData = await casesResponse.json();
            
            const allCases = (casesData && casesData.cases) ? casesData.cases : [];

            if (isAdmin(userLevel)) {
                
                
                casesToExport = _reportFilterCasesByLocationAndDate(allCases);
            } else if (userLevel === 'Lawyer') {
                casesToExport = allCases.filter(c => 
                    c.assignedLawyer === username || 
                    c.currentHandler === username
                );
            } else if (userLevel === 'LC') {
                casesToExport = allCases.filter(c =>
                    c.assigned_lc === username ||
                    c.currentHandler === username
                );
            }
        }
        
        if (casesToExport.length === 0) {
            if (typeof showToast === 'function') {
                showToast(' No cases to export.');
            } else {
                alert(' No cases to export.');
            }
            return;
        }
        
        const headers = [
            'Case ID', 
            'Case Type', 
            'Citizen', 
            'Phone', 
            'Email',
            'District', 
            'County',
            'Sub-county',
            'Parish', 
            'Village',
            'Status', 
            'Level',
            'Handler',
            'Assigned Lawyer',
            'Submission Date',
            'Resolution Date',
            'Is Urgent'
        ];
        
        const rows = casesToExport.map(c => [
            c.caseId || c.caseReference || c.caseNumber || '',
            c.caseType || c.case_type || '',
            c.citizen || c.citizenName || '',
            c.citizenPhone || c.citizen_phone || '',
            c.citizenEmail || c.citizen_email || '',
            c.district || '',
            c.county || '',
            c.subCounty || '',
            c.parish || '',
            c.village || '',
            c.status || '',
            c.level || '',
            c.currentHandler || c.handlerRole || '',
            c.assignedLawyerName || '',
            (c.submissionDate || c.created_at) ? new Date(c.submissionDate || c.created_at).toLocaleDateString() : '',
            c.resolvedDate || '',
            (c.isUrgent || c.is_urgent) ? 'Yes' : 'No'
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cases_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        if (typeof showToast === 'function') {
            showToast(` ${casesToExport.length} cases exported successfully!`);
        } else {
            alert(` ${casesToExport.length} cases exported successfully!`);
        }

    } catch (error) {
        console.error('Error exporting cases:', error);
        alert('Failed to export cases: ' + error.message);
    }
}
function closePDFExport() {
    document.getElementById('pdfExportContainer').style.display = 'none';

    
    
    
    
    
    
    if (typeof showAdminHome === 'function') {
        showAdminHome();
        return;
    }

    document.getElementById('approvalContainer').style.display = 'block';
    document.getElementById('lawyerManagementContainer').style.display = 'none';
    document.getElementById('lawyerPerformanceContainer').style.display = 'none';
    
    const preview = document.getElementById('reportPreview');
    if (preview) {
        preview.style.display = 'none';
        const content = document.getElementById('reportPreviewContent');
        if (content) content.innerHTML = '';
    }
    
    const reportType = document.getElementById('reportType');
    if (reportType) reportType.value = '';
    
    const filterContainer = document.getElementById('filterContainer');
    if (filterContainer) filterContainer.style.display = 'none';
}

function updateReportFilters() {
    const reportType = document.getElementById('reportType').value;
    const filterContainer = document.getElementById('filterContainer');
    const dynamicFilters = document.getElementById('dynamicFilters');
    
    if (!reportType) {
        filterContainer.style.display = 'none';
        return;
    }
    
    filterContainer.style.display = 'block';
    let html = '';
    
    let districts = [];
    if (typeof ugandaDistricts !== 'undefined' && ugandaDistricts.length > 0) {
        districts = ugandaDistricts;
    } else {
        districts = [
            "Kampala", "Wakiso", "Mukono", "Gulu", "Jinja", "Mbarara", 
            "Masaka", "Mbale", "Lira", "Soroti", "Arua", "Kabale",
            "Fort Portal", "Entebbe", "Tororo", "Busia", "Hoima", "Kasese"
        ];
    }
    
    let counties = [];
    if (typeof ugandaCounties !== 'undefined') {
        Object.values(ugandaCounties).forEach(countyList => {
            if (Array.isArray(countyList)) {
                counties = counties.concat(countyList);
            }
        });
        counties = [...new Set(counties)];
    }
    
    let subCounties = [];
    if (typeof ugandaSubCounties !== 'undefined') {
        Object.values(ugandaSubCounties).forEach(subCountyList => {
            if (Array.isArray(subCountyList)) {
                subCounties = subCounties.concat(subCountyList);
            }
        });
        subCounties = [...new Set(subCounties)];
    }
    
    let parishes = [];
    if (typeof ugandaParishes !== 'undefined') {
        Object.values(ugandaParishes).forEach(parishList => {
            if (Array.isArray(parishList)) {
                parishes = parishes.concat(parishList);
            }
        });
        parishes = [...new Set(parishes)];
    }
    
    let villages = [];
    if (typeof ugandaVillages !== 'undefined') {
        Object.values(ugandaVillages).forEach(villageList => {
            if (Array.isArray(villageList)) {
                villages = villages.concat(villageList);
            }
        });
        villages = [...new Set(villages)];
    }
    
    switch(reportType) {
        case 'cases_by_lawyer':
            html = `
                <label style="font-weight:600; display:block; margin-bottom:5px;">Select Lawyer</label>
                <select id="reportLawyerFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;">
                    <option value="">-- All Lawyers --</option>
                    ${getAllLawyers().map(l => `<option value="${l.username}">${l.firstName} ${l.lastName} (${l.lawyerSpecialization || 'N/A'})</option>`).join('')}
                </select>
            `;
            break;
            
        case 'cases_by_district':
            html = `
                <label style="font-weight:600; display:block; margin-bottom:5px;">Select District</label>
                ${_reportIsDistrictAdmin() ? `
                    <input type="hidden" id="reportDistrictFilter" value="${_reportOwnDistrict()}">
                    <div style="padding:12px; border:1px solid #ccc; border-radius:8px; font-size:15px; background:#f5f5f7; color:#333;">
                        &#128274; ${_reportOwnDistrict() || 'No district assigned'} <span style="font-size:12px; color:#888;">(your assigned district)</span>
                    </div>
                ` : `
                <div style="position:relative;">
                    <input type="text" id="reportDistrictSearch" placeholder="Search or type district name..." 
                           style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;"
                           onkeyup="filterReportDropdown('reportDistrictSearch', 'reportDistrictFilter')"
                           onfocus="this.select()">
                    <select id="reportDistrictFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white; margin-top:5px;">
                        <option value="">-- All Districts --</option>
                        ${districts.sort().map(d => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                    <div style="font-size:11px; color:#888; margin-top:3px;"> Type to search or select from dropdown</div>
                </div>
                `}
                
                <label style="font-weight:600; display:block; margin-top:10px;">Select County (Optional)</label>
                <div style="position:relative;">
                    <input type="text" id="reportCountySearch" placeholder="Search or type county name..." 
                           style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;"
                           onkeyup="filterReportDropdown('reportCountySearch', 'reportCountyFilter')"
                           onfocus="this.select()">
                    <select id="reportCountyFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white; margin-top:5px;">
                        <option value="">-- All Counties --</option>
                        ${counties.sort().map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <div style="font-size:11px; color:#888; margin-top:3px;"> Type to search or select from dropdown</div>
                </div>
                
                <label style="font-weight:600; display:block; margin-top:10px;">Select Sub-county (Optional)</label>
                <div style="position:relative;">
                    <input type="text" id="reportSubCountySearch" placeholder="Search or type sub-county name..." 
                           style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;"
                           onkeyup="filterReportDropdown('reportSubCountySearch', 'reportSubCountyFilter')"
                           onfocus="this.select()">
                    <select id="reportSubCountyFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white; margin-top:5px;">
                        <option value="">-- All Sub-counties --</option>
                        ${subCounties.sort().map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                    <div style="font-size:11px; color:#888; margin-top:3px;"> Type to search or select from dropdown</div>
                </div>
            `;
            break;
            
        case 'cases_by_village':
            html = `
                <label style="font-weight:600; display:block; margin-bottom:5px;">Select District</label>
                <div style="position:relative;">
                    <input type="text" id="reportVillageDistrictSearch" placeholder="Search or type district name..." 
                           style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;"
                           onkeyup="filterReportDropdown('reportVillageDistrictSearch', 'reportVillageDistrictFilter')"
                           onfocus="this.select()">
                    <select id="reportVillageDistrictFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white; margin-top:5px;" onchange="updateVillageFilters()">
                        <option value="">-- All Districts --</option>
                        ${districts.sort().map(d => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                    <div style="font-size:11px; color:#888; margin-top:3px;"> Type to search or select from dropdown</div>
                </div>
                
                <label style="font-weight:600; display:block; margin-top:10px;">Select Parish</label>
                <div style="position:relative;">
                    <input type="text" id="reportParishSearch" placeholder="Search or type parish name..." 
                           style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;"
                           onkeyup="filterReportDropdown('reportParishSearch', 'reportParishFilter')"
                           onfocus="this.select()">
                    <select id="reportParishFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white; margin-top:5px;">
                        <option value="">-- All Parishes --</option>
                        ${parishes.sort().map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                    <div style="font-size:11px; color:#888; margin-top:3px;"> Type to search or select from dropdown</div>
                </div>
                
                <label style="font-weight:600; display:block; margin-top:10px;">Select Village</label>
                <div style="position:relative;">
                    <input type="text" id="reportVillageSearch" placeholder="Search or type village name..." 
                           style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;"
                           onkeyup="filterReportDropdown('reportVillageSearch', 'reportVillageFilter')"
                           onfocus="this.select()">
                    <select id="reportVillageFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white; margin-top:5px;">
                        <option value="">-- All Villages --</option>
                        ${villages.sort().map(v => `<option value="${v}">${v}</option>`).join('')}
                    </select>
                    <div style="font-size:11px; color:#888; margin-top:3px;"> Type to search or select from dropdown</div>
                </div>
            `;
            break;
            
        case 'cases_by_status':
            html = `
                <label style="font-weight:600; display:block; margin-bottom:5px;">Select Status</label>
                <select id="reportStatusFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;">
                    <option value="">-- All Statuses --</option>
                    <option value="Pending"> Pending</option>
                    <option value="Resolved"> Resolved</option>
                    <option value="Accepted by Lawyer"> Accepted by Lawyer</option>
                    <option value="Forwarded to Lawyer"> Forwarded to Lawyer</option>
                </select>
            `;
            break;
            
        case 'single_case':
            html = `
                <label style="font-weight:600; display:block; margin-bottom:5px;">Case ID <span style="color:red;">*</span></label>
                <input type="text" id="reportCaseIdFilter" placeholder="Enter Case ID" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;">
                <div style="font-size:12px; color:#666; margin-top:5px;"> Enter the exact Case ID</div>
            `;
            break;
            
        case 'lawyer_performance':
            html = `
                <label style="font-weight:600; display:block; margin-bottom:5px;">Select Lawyer</label>
                <select id="reportLawyerPerfFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;">
                    <option value="">-- All Lawyers --</option>
                    ${getAllLawyers().map(l => `<option value="${l.username}">${l.firstName} ${l.lastName}</option>`).join('')}
                </select>
                <div style="margin-top:10px; display:flex; gap:15px; flex-wrap:wrap;">
                    <label><input type="checkbox" id="includeResolutionTime" checked> Include Resolution Time</label>
                    <label><input type="checkbox" id="includeCaseTypes" checked> Include Case Types</label>
                </div>
            `;
            break;
            
        case 'subscription_report':
            html = `
                <div style="display:flex; gap:15px; flex-wrap:wrap;">
                    <label><input type="radio" name="subStatus" value="all" checked> All Lawyers</label>
                    <label><input type="radio" name="subStatus" value="subscribed"> Subscribed Only</label>
                    <label><input type="radio" name="subStatus" value="unsubscribed"> Unsubscribed Only</label>
                </div>
                <label style="font-weight:600; display:block; margin-top:10px;">Filter by District</label>
                <div style="position:relative;">
                    <input type="text" id="reportSubDistrictSearch" placeholder="Search or type district name..." 
                           style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;"
                           onkeyup="filterReportDropdown('reportSubDistrictSearch', 'reportSubDistrictFilter')"
                           onfocus="this.select()">
                    <select id="reportSubDistrictFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white; margin-top:5px;">
                        <option value="">-- All Districts --</option>
                        ${districts.sort().map(d => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                    <div style="font-size:11px; color:#888; margin-top:3px;"> Type to search or select from dropdown</div>
                </div>
            `;
            break;
            
        case 'user_report':
            html = `
                <label style="font-weight:600; display:block; margin-bottom:5px;">User Type</label>
                <select id="reportUserTypeFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;">
                    <option value="all">All Users</option>
                    <option value="Citizen">Citizens</option>
                    <option value="Lawyer">Lawyers</option>
                </select>
                <label style="font-weight:600; display:block; margin-top:10px;">Filter by District</label>
                ${_reportIsDistrictAdmin() ? `
                    <input type="hidden" id="reportUserDistrictFilter" value="${_reportOwnDistrict()}">
                    <div style="padding:12px; border:1px solid #ccc; border-radius:8px; font-size:15px; background:#f5f5f7; color:#333;">
                        &#128274; ${_reportOwnDistrict() || 'No district assigned'} <span style="font-size:12px; color:#888;">(your assigned district)</span>
                    </div>
                ` : `
                <div style="position:relative;">
                    <input type="text" id="reportUserDistrictSearch" placeholder="Search or type district name..." 
                           style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px;"
                           onkeyup="filterReportDropdown('reportUserDistrictSearch', 'reportUserDistrictFilter')"
                           onfocus="this.select()">
                    <select id="reportUserDistrictFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white; margin-top:5px;">
                        <option value="">-- All Districts --</option>
                        ${districts.sort().map(d => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                    <div style="font-size:11px; color:#888; margin-top:3px;"> Type to search or select from dropdown</div>
                </div>
                `}
                <label style="font-weight:600; display:block; margin-top:10px;">Approval Status</label>
                <select id="reportUserStatusFilter" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;">
                    <option value="">All Statuses</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                </select>
            `;
            break;
            
        default:
            html = `<p style="color:#999;">Select a report type to see filters.</p>`;
    }
    
    dynamicFilters.innerHTML = html;
}

function filterReportDropdown(searchInputId, selectId) {
    const searchInput = document.getElementById(searchInputId);
    const select = document.getElementById(selectId);
    
    if (!searchInput || !select) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const options = select.options;
    
    let hasMatch = false;
    
    for (let i = 0; i < options.length; i++) {
        const optionText = options[i].text.toLowerCase();
        const optionValue = options[i].value.toLowerCase();
        
        if (searchTerm === '') {
            options[i].style.display = '';
            hasMatch = true;
            continue;
        }
        
        if (optionText.includes(searchTerm) || optionValue.includes(searchTerm)) {
            options[i].style.display = '';
            hasMatch = true;
        } else {
            options[i].style.display = 'none';
        }
    }
    
    if (!hasMatch && searchTerm !== '') {
        let noMatchOption = select.querySelector('.no-match-option');
        if (!noMatchOption) {
            noMatchOption = document.createElement('option');
            noMatchOption.className = 'no-match-option';
            noMatchOption.value = '';
            noMatchOption.textContent = '-- No matches found --';
            noMatchOption.disabled = true;
            select.appendChild(noMatchOption);
        }
        noMatchOption.style.display = '';
    } else {
        const noMatchOption = select.querySelector('.no-match-option');
        if (noMatchOption) {
            noMatchOption.remove();
        }
    }
    
    if (searchTerm !== '' && !hasMatch) {
        const customValue = searchTerm;
        if (customValue.length > 2) {
            let exists = false;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value.toLowerCase() === customValue.toLowerCase()) {
                    exists = true;
                    break;
                }
            }
            if (!exists && customValue.length > 0) {
                const tempOption = document.createElement('option');
                tempOption.value = customValue;
                tempOption.textContent = customValue + ' (Custom)';
                tempOption.style.fontStyle = 'italic';
                tempOption.style.color = '#1a4080';
                const noMatch = select.querySelector('.no-match-option');
                if (noMatch) {
                    select.insertBefore(tempOption, noMatch);
                } else {
                    select.appendChild(tempOption);
                }
                tempOption.selected = true;
                select.dispatchEvent(new Event('change'));
            }
        }
    }
}
function updateVillageFilters() {
    
    const district = document.getElementById('reportVillageDistrictFilter')?.value;
    if (district) {
       
        console.log('Selected district for village filter:', district);
    }
}


function getAllLawyers() {
    let lawyers = [];
    for (const _lsKey of Object.keys(_lcdjp_user_index)) {
        const key = _lsKey;
        if (key && key.startsWith('user_')) {
            const user = (_lcdjp_user_index[key] || {});
            if (user.userType === 'Lawyer' && user.approvalStatus === 'Approved') {
                lawyers.push(user);
            }
        }
    }
    return lawyers;
}

const CODE_CONFIG = {
    prefixes: {
        case: 'CASE',
        user: 'USER',
        lawyer: 'LAW',
        transaction: 'TXN',
        notification: 'NOTIF',
        subscription: 'SUB',
        document: 'DOC',
        report: 'RPT'
    },
    
    lengths: {
        case: 6,
        user: 8,
        lawyer: 8,
        transaction: 10,
        notification: 10,
        subscription: 8,
        document: 8,
        report: 6
    },
    
    dateFormat: 'YYMMDD'
};


function generateCaseNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const allCases = _lcdjpStore.cases;
    const todayCases = allCases.filter(c => {
        const cDate = new Date(c.submissionDate || c.registrationDate || c.timestamp);
        return cDate.getDate() === date.getDate() &&
               cDate.getMonth() === date.getMonth() &&
               cDate.getFullYear() === date.getFullYear();
    });
    
    const sequence = String(todayCases.length + 1).padStart(4, '0');
    const code = `CASE-${year}${month}${day}-${sequence}`;
    
    if (allCases.some(c => c.caseId === code || c.caseNumber === code)) {
        return generateCaseNumber(); 
    }
    
    return code;
}

function generateUserId(userType) {
    const prefixMap = {
        'Citizen': 'CIT',
        'Lawyer': 'LAW'
    };
    
    const prefix = prefixMap[userType] || 'USR';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    let count = 0;
    for (const _lsKey of Object.keys(_lcdjp_user_index)) {
        const key = _lsKey;
        if (key && key.startsWith('user_')) {
            count++;
        }
    }
    
    const sequence = String(count + 1).padStart(5, '0');
    const code = `${prefix}${year}${month}${sequence}`;
    
    for (const _lsKey of Object.keys(_lcdjp_user_index)) {
        const key = _lsKey;
        if (key && key.startsWith('user_')) {
            const user = (_lcdjp_user_index[key] || {});
            if (user.userId === code) {
                return generateUserId(userType); 
            }
        }
    }
    
    return code;
}

function generateTransactionRef() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 6; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `TXN-${year}${month}${day}-${hours}${minutes}-${random}`;
}

async function generateSubscriptionId() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using fallback ID');
            const timestamp = Date.now().toString().slice(-6);
            return `SUB-${year}${month}-${timestamp}`;
        }

        const response = await fetch(API_ENDPOINTS.subscriptionCount, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subscription count');
        }

        const data = await response.json();
        const count = data.count || 0;
        const sequence = String(count + 1).padStart(4, '0');
        
        return `SUB-${year}${month}-${sequence}`;
    } catch (error) {
        console.error('Error generating subscription ID:', error);
        const timestamp = Date.now().toString().slice(-6);
        return `SUB-${year}${month}-${timestamp}`;
    }
}
function showLawyerNotificationsPage() {
    hideAllDashboardViews();
    document.getElementById("lawyerNotificationsPage").style.display = "block";
    renderLawyerNotificationPage();
    renderNavbarNotifBadge();
}















window.mobileLawyerNotifications = function () {
    if (window.innerWidth > 767) {
        if (typeof toggleNotifications === 'function') toggleNotifications();
        return;
    }
    var content = document.getElementById('contentArea');
    var srcPage = document.getElementById('lawyerNotificationsPage');
    if (!content || !srcPage) return;

    
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();
    var oldPanel = document.getElementById('mobileLawyerNotificationsPanel');
    if (oldPanel) oldPanel.remove();

    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    
    
    if (!srcPage._lcdjpOrigParent) {
        srcPage._lcdjpOrigParent = srcPage.parentNode;
        srcPage._lcdjpOrigNext = srcPage.nextSibling;
    }

    var panel = document.createElement('section');
    panel.id = 'mobileLawyerNotificationsPanel';
    panel.className = 'mobile-messages-panel';

    var head = document.createElement('div');
    head.className = 'mobile-role-panel-head';
    head.innerHTML = '<h2>Notifications</h2><button class="mobile-role-panel-close" aria-label="Close">&times;</button>';
    panel.appendChild(head);

    srcPage.style.display = 'block';
    panel.appendChild(srcPage);

    head.querySelector('button').onclick = function () {
        panel.remove();
        if (srcPage._lcdjpOrigNext && srcPage._lcdjpOrigNext.parentNode === srcPage._lcdjpOrigParent) {
            srcPage._lcdjpOrigParent.insertBefore(srcPage, srcPage._lcdjpOrigNext);
        } else if (srcPage._lcdjpOrigParent) {
            srcPage._lcdjpOrigParent.appendChild(srcPage);
        }
        srcPage.style.display = 'none';
        if (typeof showLawyerDashboard === 'function') showLawyerDashboard();
    };

    content.appendChild(panel);
    renderLawyerNotificationPage();
    if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();
};

async function renderLawyerNotificationPage() {
    const username = sessionStorage.getItem('lcdjp_username');
    if (!username) return;
    
    let notifications = await getNotificationsForUser(username);
    if (!Array.isArray(notifications)) {
        notifications = [];
    }
    
    const unreadCount = await getUnreadCount(username);
    const listContainer = document.getElementById('lawyerNotificationsPageList');
    const badge = document.getElementById('lawyerNotifPageBadge');
    const markAllBtn = document.getElementById('lawyerNotifMarkAllBtn');
    
    if (!listContainer) return;
    
    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = unreadCount + ' New';
        } else {
            badge.style.display = 'none';
        }
    }
    
    if (markAllBtn) {
        markAllBtn.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
    
    let html = '';
    
    if (notifications.length === 0) {
        html = `
            <div style="text-align:center; padding:60px 20px; color:#999;">
                <div style="font-size:48px; margin-bottom:10px;"></div>
                <p>No notifications yet</p>
            </div>
        `;
    } else {
        const sortedNotifications = [...notifications].sort((a, b) => {
            const dateA = new Date(a.timestamp || a.date || 0);
            const dateB = new Date(b.timestamp || b.date || 0);
            return dateB - dateA;
        });
        
        sortedNotifications.forEach(notif => {
            const isUrgent = notif.priority <= 2;
            const bgColor = notif.read ? '#f8f9fa' : (isUrgent ? '#fff3cd' : '#f0f5ff');
            const borderColor = isUrgent ? '#dc3545' : (notif.read ? '#ccc' : '#1a4080');
            const icon = getNotificationIcon(notif.type);
            
            html += `
                <div onclick="lcdjpOpenNotification(${JSON.stringify(notif).replace(/"/g, '&quot;')})" 
                     style="background:${bgColor}; 
                            padding:15px; 
                            margin-bottom:10px; 
                            border-radius:8px; 
                            cursor:pointer;
                            transition: all 0.2s ease;
                            ${!notif.read ? 'box-shadow: 0 2px 8px rgba(26,64,128,0.1);' : ''}"
                     onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                     onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none';">
                    <div style="display:flex; align-items:flex-start; gap:12px;">
                        <div style="font-size:24px;">${icon}</div>
                        <div style="flex:1;">
                            <div style="font-weight:${notif.read ? 'normal' : 'bold'}; color:${notif.read ? '#555' : '#333'};">
                                ${notif.message}
                            </div>
                            ${notif.caseId ? `<div style="font-size:12px; color:#1a4080; font-weight:bold;">Case: ${notif.caseId}</div>` : ''}
                            <div style="font-size:11px; color:#999; margin-top:4px;">
                                ${new Date(notif.timestamp || notif.date).toLocaleString()}
                                ${!notif.read ? ' • <span style="color:#dc3545; font-weight:bold;">New</span>' : ''}
                                ${isUrgent ? ' • <span style="color:#dc3545; font-weight:bold;"> Urgent</span>' : ''}
                            </div>
                            ${notif.type === 'new_message' ? `<div style="margin-top:8px; padding:8px 12px; background:#e3f2fd; border-radius:4px; font-size:13px; color:#0d47a1;"> This is a message from a citizen or admin</div>` : ''}
                        </div>
                        ${!notif.read ? `<div style="width:10px; height:10px; background:#dc3545; border-radius:50%; flex-shrink:0; margin-top:5px;"></div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    listContainer.innerHTML = html;
}
function refreshLawyerNotificationPage() {
    renderLawyerNotificationPage();
    renderNavbarNotifBadge();
}


function generateNotificationId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NOTIF-${timestamp}-${random}`;
}


async function generatePDFReport() {
    try {
        const reportType = document.getElementById('reportType').value;
        const fromDate = document.getElementById('reportFromDate').value;
        const toDate = document.getElementById('reportToDate').value;
        
        if (!reportType) {
            alert('Please select a report type.');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            alert('Authentication token not found');
            return;
        }

        if (reportType === 'user_report') {
            await generateUsersPDFReport(fromDate, toDate);
            return;
        }

        const response = await fetch(API_ENDPOINTS.cases, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cases');
        }

        const casesData = await response.json();
        
        const allCases = (casesData && casesData.cases) ? casesData.cases : [];

        let filteredCases = allCases;
        if (fromDate && toDate) {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            
            filteredCases = allCases.filter(c => {
                const caseDate = new Date(c.submissionDate || c.registrationDate || c.timestamp);
                return caseDate >= from && caseDate <= to;
            });
        }
        
        if (filteredCases.length === 0) {
            alert('No cases found for the selected date range.');
            return;
        }
        
        let reportData = await generateReportData(reportType, filteredCases);
        
        if (typeof showReportPreview === 'function') {
            showReportPreview(reportData);
        }
        
        if (typeof generatePDF === 'function') {
            generatePDF(reportData);
        }

    } catch (error) {
        console.error('Error generating PDF report:', error);
        alert('Failed to generate report: ' + error.message);
    }
}


function generateReportData(reportType, cases) {
    const reportData = {
        title: '',
        headers: [],
        rows: [],
        summary: {},
        generatedAt: new Date().toLocaleString()
    };
    
    switch(reportType) {
        case 'all_cases':
            reportData.title = ' Complete Cases Report';
            reportData.headers = ['Case ID', 'Type', 'Citizen', 'Phone', 'Location', 'Status', 'Level', 'Date'];
            reportData.rows = cases.map(c => [
                c.caseId || 'N/A',
                c.caseType || 'N/A',
                c.citizen || 'N/A',
                c.citizenPhone || 'N/A',
                c.fullLocation || `${c.village || ''}, ${c.parish || ''}`,
                c.status || 'N/A',
                c.level || 'N/A',
                new Date(c.submissionDate || c.registrationDate).toLocaleDateString()
            ]);
            reportData.summary = {
                'Total Cases': cases.length,
                'Pending': cases.filter(c => c.status === 'Pending').length,
                'Resolved': cases.filter(c => c.status === 'Resolved').length,
                'With Lawyers': cases.filter(c => c.status === 'Accepted by Lawyer' || c.status === 'Forwarded to Lawyer').length
            };
            break;
            
        case 'cases_by_lawyer':
            const lawyerFilter = document.getElementById('reportLawyerFilter')?.value;
            let lawyerCases = lawyerFilter ? cases.filter(c => c.assignedLawyer === lawyerFilter) : cases;
            let lawyerName = lawyerFilter ? 
                (getAllLawyers().find(l => l.username === lawyerFilter)?.firstName || '') + ' ' + 
                (getAllLawyers().find(l => l.username === lawyerFilter)?.lastName || '') : 'All Lawyers';
            
            reportData.title = ` Cases by Lawyer: ${lawyerName}`;
            reportData.headers = ['Case ID', 'Type', 'Citizen', 'Status', 'Accepted Date', 'Resolution Time'];
            reportData.rows = lawyerCases.map(c => {
                let resolutionTime = 'N/A';
                if (c.status === 'Resolved' && c.acceptedDate && c.resolvedDate) {
                    const start = new Date(c.acceptedDate);
                    const end = new Date(c.resolvedDate);
                    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                    resolutionTime = days + ' days';
                }
                return [
                    c.caseId || 'N/A',
                    c.caseType || 'N/A',
                    c.citizen || 'N/A',
                    c.status || 'N/A',
                    c.acceptedDate || 'N/A',
                    resolutionTime
                ];
            });
            reportData.summary = {
                'Total Cases': lawyerCases.length,
                'Resolved': lawyerCases.filter(c => c.status === 'Resolved').length,
                'In Progress': lawyerCases.filter(c => c.status === 'Accepted by Lawyer').length
            };
            break;
            
        case 'cases_by_district':
            const districtFilter = document.getElementById('reportDistrictFilter')?.value ||
                                   document.getElementById('reportDistrictSearch')?.value || '';

            
            
            let districtCases = _reportFilterCasesByLocationAndDate(cases);
            
            reportData.title = districtFilter ? ` Cases in ${districtFilter}` : ` Cases by Location`;
            reportData.headers = ['Case ID', 'Type', 'Citizen', 'District', 'County', 'Sub-county', 'Parish', 'Village', 'Status'];
            reportData.rows = districtCases.map(c => [
                c.caseId || 'N/A',
                c.caseType || 'N/A',
                c.citizen || 'N/A',
                c.district || c.districtDisplay || c.districtRaw || 'N/A',
                c.county || c.countyDisplay || c.countyRaw || 'N/A',
                c.subCounty || c.subCountyDisplay || c.subCountyRaw || 'N/A',
                c.parish || c.parishDisplay || c.parishRaw || 'N/A',
                c.village || c.villageDisplay || c.villageRaw || 'N/A',
                c.status || 'N/A'
            ]);
            
            let locationStats = {};
            districtCases.forEach(c => {
                const loc = c.district || c.districtDisplay || 'Unknown';
                locationStats[loc] = (locationStats[loc] || 0) + 1;
            });
            reportData.summary = {
                'Total Cases': districtCases.length,
                'Locations': Object.keys(locationStats).length,
                'Top Location': Object.entries(locationStats).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A'
            };
            break;
            
        case 'cases_by_village':
            const villageDistrictFilter = document.getElementById('reportVillageDistrictFilter')?.value || 
                                         document.getElementById('reportVillageDistrictSearch')?.value || '';
            const parishFilter = document.getElementById('reportParishFilter')?.value || 
                                document.getElementById('reportParishSearch')?.value || '';
            const villageFilter = document.getElementById('reportVillageFilter')?.value || 
                                 document.getElementById('reportVillageSearch')?.value || '';
            
            let villageCases = cases;
            
            if (villageDistrictFilter && villageDistrictFilter !== '') {
                villageCases = villageCases.filter(c => 
                    c.district === villageDistrictFilter || 
                    c.districtDisplay === villageDistrictFilter ||
                    c.districtRaw === villageDistrictFilter ||
                    (c.locationKeys && c.locationKeys.district === villageDistrictFilter)
                );
            }
            
            if (parishFilter && parishFilter !== '') {
                villageCases = villageCases.filter(c => 
                    c.parish === parishFilter || 
                    c.parishDisplay === parishFilter ||
                    c.parishRaw === parishFilter ||
                    (c.locationKeys && c.locationKeys.parish === parishFilter)
                );
            }
            
            if (villageFilter && villageFilter !== '') {
                villageCases = villageCases.filter(c => 
                    c.village === villageFilter || 
                    c.villageDisplay === villageFilter ||
                    c.villageRaw === villageFilter ||
                    (c.locationKeys && c.locationKeys.village === villageFilter)
                );
            }
            
            reportData.title = ` Cases by Village`;
            reportData.headers = ['Case ID', 'Type', 'Citizen', 'District', 'Parish', 'Village', 'Status'];
            reportData.rows = villageCases.map(c => [
                c.caseId || 'N/A',
                c.caseType || 'N/A',
                c.citizen || 'N/A',
                c.district || c.districtDisplay || 'N/A',
                c.parish || c.parishDisplay || 'N/A',
                c.village || c.villageDisplay || 'N/A',
                c.status || 'N/A'
            ]);
            reportData.summary = {
                'Total Cases': villageCases.length,
                'Villages': new Set(villageCases.map(c => c.village || c.villageDisplay)).size,
                'Parishes': new Set(villageCases.map(c => c.parish || c.parishDisplay)).size
            };
            break;
            
        case 'cases_by_status':
            const statusFilter = document.getElementById('reportStatusFilter')?.value;
            let statusCases = statusFilter ? cases.filter(c => c.status === statusFilter) : cases;
            
            reportData.title = ` Cases by Status: ${statusFilter || 'All Statuses'}`;
            reportData.headers = ['Case ID', 'Type', 'Citizen', 'Location', 'Level', 'Date'];
            reportData.rows = statusCases.map(c => [
                c.caseId || 'N/A',
                c.caseType || 'N/A',
                c.citizen || 'N/A',
                c.fullLocation || `${c.village || ''}, ${c.parish || ''}`,
                c.level || 'N/A',
                new Date(c.submissionDate || c.registrationDate).toLocaleDateString()
            ]);
            
            let statusStats = {};
            cases.forEach(c => {
                const status = c.status || 'Unknown';
                statusStats[status] = (statusStats[status] || 0) + 1;
            });
            reportData.summary = statusStats;
            break;
            
        case 'single_case':
            const caseIdFilter = document.getElementById('reportCaseIdFilter')?.value?.toUpperCase() || '';
            let singleCase = cases.find(c => c.caseId === caseIdFilter);
            
            if (!singleCase) {
                alert('Case not found. Please check the Case ID.');
                return null;
            }
            
            reportData.title = ` Case Details: ${singleCase.caseId}`;
            reportData.headers = ['Field', 'Value'];
            reportData.rows = [
                ['Case ID', singleCase.caseId || 'N/A'],
                ['Case Type', singleCase.caseType || 'N/A'],
                ['Citizen', singleCase.citizen || 'N/A'],
                ['Phone', singleCase.citizenPhone || 'N/A'],
                ['Email', singleCase.citizenEmail || 'N/A'],
                ['Location', singleCase.fullLocation || `${singleCase.village || ''}, ${singleCase.parish || ''}`],
                ['Status', singleCase.status || 'N/A'],
                ['Level', singleCase.level || 'N/A'],
                ['Description', singleCase.description || 'N/A'],
                ['Submitted', new Date(singleCase.submissionDate || singleCase.registrationDate).toLocaleString()],
                ['Assigned Lawyer', singleCase.assignedLawyerName || 'Not Assigned'],
                ['Next of Kin', singleCase.kinName || 'N/A'],
                ['Next of Kin Phone', singleCase.kinPhone || 'N/A'],
                ['Next of Kin Relationship', singleCase.kinRelationship || 'N/A']
            ];
            reportData.summary = {
                'Status': singleCase.status || 'N/A',
                'Assigned To': singleCase.assignedLawyerName || 'Not Assigned'
            };
            break;
            
        case 'lawyer_performance':
            const lawyerPerfFilter = document.getElementById('reportLawyerPerfFilter')?.value;
            let perfLawyers = lawyerPerfFilter ? getAllLawyers().filter(l => l.username === lawyerPerfFilter) : getAllLawyers();
            const includeTime = document.getElementById('includeResolutionTime')?.checked;
            const includeTypes = document.getElementById('includeCaseTypes')?.checked;
            
            reportData.title = ` Lawyer Performance Report${lawyerPerfFilter ? ' - ' + (perfLawyers[0]?.firstName || '') + ' ' + (perfLawyers[0]?.lastName || '') : ''}`;
            reportData.headers = ['Lawyer', 'Specialization', 'Total Cases', 'Accepted', 'Resolved', 'Pending', 'Rate'];
            if (includeTime) reportData.headers.push('Avg Days');
            if (includeTypes) reportData.headers.push('Case Types');
            
            reportData.rows = perfLawyers.map(l => {
                const lawyerCases = cases.filter(c => c.assignedLawyer === l.username);
                const total = lawyerCases.length;
                const resolved = lawyerCases.filter(c => c.status === 'Resolved').length;
                const accepted = lawyerCases.filter(c => c.status === 'Accepted by Lawyer').length;
                const pending = total - resolved - accepted;
                const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
                
                let row = [
                    `${l.firstName} ${l.lastName}`,
                    l.lawyerSpecialization || 'N/A',
                    total.toString(),
                    accepted.toString(),
                    resolved.toString(),
                    pending.toString(),
                    rate + '%'
                ];
                
                if (includeTime) {
                    let times = [];
                    lawyerCases.filter(c => c.status === 'Resolved').forEach(c => {
                        if (c.acceptedDate && c.resolvedDate) {
                            const start = new Date(c.acceptedDate);
                            const end = new Date(c.resolvedDate);
                            times.push(Math.floor((end - start) / (1000 * 60 * 60 * 24)));
                        }
                    });
                    const avgTime = times.length > 0 ? Math.round(times.reduce((a,b) => a+b, 0) / times.length) : 0;
                    row.push(avgTime > 0 ? avgTime + ' days' : 'N/A');
                }
                
                if (includeTypes) {
                    let types = {};
                    lawyerCases.forEach(c => {
                        types[c.caseType] = (types[c.caseType] || 0) + 1;
                    });
                    row.push(Object.entries(types).map(([k,v]) => `${k}(${v})`).join(', '));
                }
                
                return row;
            });
            
            reportData.summary = {
                'Total Lawyers': perfLawyers.length,
                'Active Lawyers': perfLawyers.filter(l => cases.some(c => c.assignedLawyer === l.username)).length
            };
            break;
            
        case 'subscription_report':
            const subStatus = document.querySelector('input[name="subStatus"]:checked')?.value || 'all';
            let allLawyers = getAllLawyers();
            let subLawyers = allLawyers.filter(l => {
                const isSub = isLawyerSubscribed(l.username);
                if (subStatus === 'subscribed') return isSub;
                if (subStatus === 'unsubscribed') return !isSub;
                return true;
            });
            
            reportData.title = ` Subscription Report${subStatus !== 'all' ? ' - ' + subStatus : ''}`;
            reportData.headers = ['Lawyer', 'Phone', 'Specialization', 'Subscription Status', 'Days Remaining', 'Payment Method'];
            reportData.rows = subLawyers.map(l => {
                const isSub = isLawyerSubscribed(l.username);
                const days = getSubscriptionDaysRemaining(l.username);
                const sub = getLawyerSubscription(l.username);
                return [
                    `${l.firstName} ${l.lastName}`,
                    l.phoneNumber || 'N/A',
                    l.lawyerSpecialization || 'N/A',
                    isSub ? ' Active' : ' Inactive',
                    isSub ? days + ' days' : 'N/A',
                    sub?.paymentMethod || 'N/A'
                ];
            });
            reportData.summary = {
                'Total Lawyers': allLawyers.length,
                'Subscribed': allLawyers.filter(l => isLawyerSubscribed(l.username)).length,
                'Unsubscribed': allLawyers.filter(l => !isLawyerSubscribed(l.username)).length
            };
            break;
            
        
        
        
            
        default:
            alert('Report type not implemented yet.');
            return null;
    }
    
    return reportData;
}





async function generateUsersPDFReport(fromDate, toDate) {
    try {
        const response = await fetch(API_ENDPOINTS.users, { headers: getAuthHeaders() });
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        const usersData = await response.json();
        const allUsers = (usersData && usersData.users) ? usersData.users : [];

        const reportData = generateUserReportData(allUsers, fromDate, toDate);
        if (!reportData) return;

        if (typeof showReportPreview === 'function') showReportPreview(reportData);
        if (typeof generatePDF === 'function') generatePDF(reportData);
    } catch (error) {
        console.error('Error generating user report:', error);
        alert('Failed to generate report: ' + error.message);
    }
}




function _reportFilterUsers(users) {
    let result = users;

    const districtFilter = document.getElementById('reportUserDistrictFilter')?.value ||
                            document.getElementById('reportUserDistrictSearch')?.value || '';
    const typeFilter = document.getElementById('reportUserTypeFilter')?.value || '';
    const statusFilter = document.getElementById('reportUserStatusFilter')?.value || '';

    if (districtFilter) {
        result = result.filter(u => (u.district || '') === districtFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
        result = result.filter(u =>
            String(u.role || u.user_type || '').toLowerCase() === typeFilter.toLowerCase()
        );
    }
    if (statusFilter) {
        result = result.filter(u =>
            String(u.approval_status || '').toLowerCase() === statusFilter.toLowerCase()
        );
    }

    return result;
}

function generateUserReportData(users, fromDate, toDate) {
    const reportData = {
        title: '',
        headers: [],
        rows: [],
        summary: {},
        generatedAt: new Date().toLocaleString()
    };

    let filtered = _reportFilterUsers(users);

    if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(u => {
            const registered = new Date(u.created_at);
            return !isNaN(registered) && registered >= from && registered <= to;
        });
    }

    const districtFilter = document.getElementById('reportUserDistrictFilter')?.value ||
                            document.getElementById('reportUserDistrictSearch')?.value || '';

    reportData.title = districtFilter ? ` Users in ${districtFilter}` : ' User Registration Report';
    reportData.headers = ['Name', 'Username', 'Role', 'Phone', 'Email', 'District', 'Approval Status', 'Verification', 'Registered'];
    reportData.rows = filtered.map(u => [
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'N/A',
        u.username || 'N/A',
        u.role || u.user_type || 'N/A',
        u.phone || 'N/A',
        u.email || 'N/A',
        u.district || 'N/A',
        u.approval_status || 'N/A',
        u.verification_status || 'N/A',
        u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'
    ]);
    reportData.summary = {
        'Total Users': filtered.length,
        'Citizens': filtered.filter(u => String(u.role || u.user_type || '').toLowerCase() === 'citizen').length,
        'Lawyers': filtered.filter(u => String(u.role || u.user_type || '').toLowerCase() === 'lawyer').length,
        'Approved': filtered.filter(u => String(u.approval_status || '').toLowerCase() === 'approved').length,
        'Pending': filtered.filter(u => String(u.approval_status || '').toLowerCase() === 'pending').length
    };

    return reportData;
}

async function exportUsersToCSV() {
    try {
        const token = getAuthToken();
        if (!token) {
            alert('Authentication token not found');
            return;
        }

        const response = await fetch(API_ENDPOINTS.users, { headers: getAuthHeaders() });
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        const usersData = await response.json();
        const allUsers = (usersData && usersData.users) ? usersData.users : [];

        const fromDate = document.getElementById('reportFromDate')?.value;
        const toDate = document.getElementById('reportToDate')?.value;
        let users = _reportFilterUsers(allUsers);
        if (fromDate && toDate) {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            users = users.filter(u => {
                const registered = new Date(u.created_at);
                return !isNaN(registered) && registered >= from && registered <= to;
            });
        }

        if (users.length === 0) {
            if (typeof showToast === 'function') showToast(' No users to export.');
            else alert(' No users to export.');
            return;
        }

        const headers = ['Name', 'Username', 'Role', 'Phone', 'Email', 'District', 'Approval Status', 'Verification Status', 'Registered'];
        const rows = users.map(u => [
            `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            u.username || '',
            u.role || u.user_type || '',
            u.phone || '',
            u.email || '',
            u.district || '',
            u.approval_status || '',
            u.verification_status || '',
            u.created_at ? new Date(u.created_at).toLocaleDateString() : ''
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `users_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        if (typeof showToast === 'function') showToast(` ${users.length} users exported successfully!`);
        else alert(` ${users.length} users exported successfully!`);

    } catch (error) {
        console.error('Error exporting users:', error);
        alert('Failed to export users: ' + error.message);
    }
}



async function exportReportCSV() {
    const reportType = document.getElementById('reportType')?.value || '';
    if (reportType === 'user_report') {
        await exportUsersToCSV();
    } else {
        await exportCasesToCSV();
    }
}

function showReportPreview(reportData) {
    if (!reportData) return;
    
    const preview = document.getElementById('reportPreview');
    const content = document.getElementById('reportPreviewContent');
    
    preview.style.display = 'block';
    
    let html = `
        <div style="font-size:14px;">
            <h3 style="color:#1a4080;">${reportData.title}</h3>
            <p style="color:#666; font-size:12px;">Generated: ${reportData.generatedAt}</p>
            
            ${Object.keys(reportData.summary).length > 0 ? `
            <div style="background:#f0f5ff; padding:10px; border-radius:6px; margin:10px 0;">
                <strong>Summary:</strong><br>
                ${Object.entries(reportData.summary).map(([k,v]) => `${k}: ${v}`).join(' | ')}
            </div>
            ` : ''}
            
            <div style="overflow-x:auto; margin-top:10px;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:#1a4080; color:white;">
                            ${reportData.headers.map(h => `<th style="padding:8px; text-align:left; white-space:nowrap;">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.rows.map(row => `
                            <tr style="border-bottom:1px solid #ddd;">
                                ${row.map(cell => `<td style="padding:8px;">${cell}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top:10px; font-size:12px; color:#666;">
                Total Records: ${reportData.rows.length}
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function generatePDF(reportData) {
    if (!reportData) return;
    
    let htmlContent = `
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JusticeLink Report - ${reportData.title}</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #1a4080; text-align: center; border-bottom: 3px solid #1a4080; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; }
            .table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 20px; }
            table { width: 100%; min-width: 480px; border-collapse: collapse; }
            th { background: #1a4080; color: white; padding: 10px; text-align: left; white-space: nowrap; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 20px; }
            .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
            .badge-pending { background: #ffeacc; color: #ff9800; }
            .badge-resolved { background: #d4edda; color: #28a745; }
            .badge-lawyer { background: #fff3cd; color: #856404; }
            @media (max-width: 600px) {
                body { margin: 16px; font-size: 14px; }
                h1 { font-size: 20px; }
                h2 { font-size: 17px; margin-top: 20px; }
                th, td { padding: 6px; font-size: 13px; }
                .summary { padding: 10px; font-size: 13px; }
                .summary strong { display: inline-block; margin-bottom: 4px; }
                .no-print button { width: 100%; margin: 6px 0 !important; }
            }
            @media print {
                .no-print { display: none; }
                body { margin: 20px; }
                .table-wrap { overflow-x: visible; }
            }
        <\/style>
        
    <\/head>
    <body>
        <h1> JusticeLink Report</h1>
        <p style="text-align:center; color:#666;">Generated on: ${reportData.generatedAt}</p>
        
        <h2>${reportData.title}</h2>
        
        ${Object.keys(reportData.summary).length > 0 ? `
        <div class="summary">
            <strong> Summary</strong><br>
            ${Object.entries(reportData.summary).map(([k,v]) => `<strong>${k}:</strong> ${v}`).join(' &nbsp;|&nbsp; ')}
        </div>
        ` : ''}
        
        <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    ${reportData.headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${reportData.rows.map(row => `
                    <tr>
                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        </div>
        
        <div style="margin-top:20px; font-weight:bold;">
            Total Records: ${reportData.rows.length}
        </div>
        
        <div class="footer">
            <p>JusticeLink - Digital Justice Platform</p>
            <p>This is an official system generated report</p>
        </div>
        
        <div class="no-print" style="text-align:center; margin-top:30px;">
            <button onclick="window.print()" style="padding:12px 30px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer; font-size:16px;">
                 Print / Save as PDF
            </button>
            <button onclick="window.close()" style="padding:12px 30px; background:#999; color:white; border:none; border-radius:6px; cursor:pointer; font-size:16px; margin-left:10px;">
                Close
            </button>
        </div>
    <\/body>
    <\/html>
    `;
    
    let printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
    } else {
        alert('Please allow popups to generate the report.');
    }
}

let statsCharts = {};