const SUPABASE_URL = 'https://ltqybdtwvnlgfolymhvy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0cXliZHR3dm5sZ2ZvbHltaHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDMwNzEsImV4cCI6MjA5MTc3OTA3MX0.blNYNrEjXfJSsM3JgUhYX7GKL6V-2F68YXNR_uuTzpM';
const _client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentLang = 'en'; 
let translations = {};
let misIlustraciones = [];
let shopData = {};
let shopConfig = {}; 
let activeTags = [];
let currentOpenModalItemId = null; 

let activeTypes = []; 
let activeYears = []; 

const dynDicts = {
    status: { 'not_started': { es: 'En Espera', en: 'Waiting' }, 'sketch': { es: 'Boceto', en: 'Sketch' }, 'lineart': { es: 'Lineart', en: 'Lineart' }, 'color': { es: 'Color', en: 'Color' }, 'finished': { es: 'Finalizado', en: 'Finished' } },
    pay: { 'unpaid': { es: 'Pendiente', en: 'Pending' }, 'paid': { es: 'Pagado', en: 'Paid' } },
    perm: { 'private': { es: 'Privado', en: 'Private' }, 'portfolio': { es: 'Solo Portafolio', en: 'Portfolio Only' }, 'social': { es: 'Portafolio y RRSS', en: 'Portfolio & Socials' } },
    misc: { no_notes: { es: 'Sin detalles adicionales.', en: 'No additional details.' }, loading_logs: { es: 'Consultando...', en: 'Fetching...' }, no_logs: { es: 'Sin registros de actividad.', en: 'No activity logs yet.' } }
};

function format24hDate(dateString, lang) {
    const d = new Date(dateString);
    const pad = (n) => n.toString().padStart(2, '0');
    const monthsES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthsEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = lang === 'es' ? monthsES[d.getMonth()] : monthsEN[d.getMonth()];
    return `${pad(d.getDate())} ${month}, ${pad(d.getHours())}:${pad(d.getMinutes())} hrs`;
}

async function loadAllData() {
    try {
        const { data: transData } = await _client.from('translations').select('*');
        translations = { es: {}, en: {} };
        if (transData) { transData.forEach(item => { translations.es[item.key] = item.es; translations.en[item.key] = item.en; }); }

        const { data: portData } = await _client.from('portfolio').select('*').order('id', { ascending: false });
        if (portData) {
            misIlustraciones = portData.map(item => ({
                id: item.id, titulo: item.title, imagen: item.image_url, año: item.year ? item.year.toString() : "2026",
                tipo: item.type, tags: item.tags || [], object_position: item.object_position || 'center',
                destacado: item.destacado || false
            }));
        }

        const { data: colsData } = await _client.from('shop_columns').select('*').order('position');
        const { data: itemsData } = await _client.from('shop_items').select('*').order('id');
        shopData = { columns: colsData || [], items: itemsData || [] };

        const { data: configData } = await _client.from('shop_config').select('*').single();
        shopConfig = configData || {};

        updateLanguage(currentLang); 
        renderPortfolio(misIlustraciones); 
        renderMarquee(misIlustraciones); 
        renderShop(); 
        initMobileNav();
        renderCommissionStatus(); 
        renderPricelist(); 
    } catch (error) { 
        console.error("Error conectando con Supabase:", error); 
    } finally {
        const loader = document.getElementById('global-loader');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                document.body.classList.add('loaded');
            }, 500);
        } else {
            document.body.classList.add('loaded');
        }
    }
}

document.addEventListener('DOMContentLoaded', loadAllData);

window.updateLanguage = function(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.innerHTML = translations[lang][key];
    });
    renderPortfolio(misIlustraciones); 
    if (currentOpenModalItemId !== null) { fillModalData(currentOpenModalItemId); loadPublicItemHistory(currentOpenModalItemId); }
    renderLegalDocs(); 
    renderCommissionStatus(); 
    renderShop(); 
    renderPricelist(); 
    initBioCollapse();
};

window.toggleLang = function() {
    currentLang = currentLang === 'es' ? 'en' : 'es';
    document.getElementById('lang-toggle').innerText = currentLang === 'es' ? 'EN' : 'ES';
    updateLanguage(currentLang);
};

function initBioCollapse() {
    const bioText = document.querySelector('.bio');
    if (!bioText) return;

    const oldBtn = document.getElementById('bio-toggle-btn');
    if (oldBtn) oldBtn.remove();

    if (window.innerWidth <= 800) {
        bioText.classList.add('bio-collapsed');
        bioText.style.marginBottom = '5px'; 
        
        const btn = document.createElement('button');
        btn.id = 'bio-toggle-btn';
        btn.className = 'cute-btn';
        btn.style.margin = '0 auto 20px auto'; 
        btn.style.display = 'inline-flex';
        btn.style.padding = '5px 15px';
        btn.style.fontSize = '0.8rem';
        
        const isEs = currentLang === 'es';
        btn.innerHTML = `<i class="bi bi-chevron-down"></i> ${isEs ? 'Más info' : 'More info'}`;
        
        btn.onclick = () => {
            const isCollapsed = bioText.classList.contains('bio-collapsed');
            if (isCollapsed) {
                bioText.classList.remove('bio-collapsed');
                btn.innerHTML = `<i class="bi bi-chevron-up"></i> ${isEs ? 'Ocultar' : 'Show less'}`;
                bioText.style.marginBottom = '';
            } else {
                bioText.classList.add('bio-collapsed');
                btn.innerHTML = `<i class="bi bi-chevron-down"></i> ${isEs ? 'Más info' : 'More info'}`;
                bioText.style.marginBottom = '5px';
            }
        };
        
        bioText.after(btn);
    } else {
        bioText.classList.remove('bio-collapsed');
        bioText.style.marginBottom = '';
    }
}
window.addEventListener('resize', initBioCollapse);

function renderCommissionStatus() {
    const badge = document.getElementById('comm-badge');
    const statusText = document.getElementById('comm-status-text');
    const slotsContainer = document.getElementById('comm-slots');
    const slotsCount = document.getElementById('comm-slots-count');

    if (!badge || !shopConfig) return;

    if (shopConfig.is_open) {
        badge.className = 'mood-badge status-open';
        statusText.setAttribute('data-i18n', 'comm_status_open');
        statusText.innerText = translations[currentLang]?.comm_status_open || 'Comisiones Abiertas';
        
        if (shopConfig.is_infinite) {
            slotsContainer.style.display = 'none';
        } else {
            slotsContainer.style.display = 'block';
            slotsCount.innerText = `${shopConfig.current_slots || 0} / ${shopConfig.max_slots || 0}`;
        }
    } else {
        badge.className = 'mood-badge status-closed';
        statusText.setAttribute('data-i18n', 'comm_status_closed');
        statusText.innerText = translations[currentLang]?.comm_status_closed || 'Comisiones Cerradas';
        slotsContainer.style.display = 'none';
    }
}

async function renderShop() {
    const board = document.getElementById('dynamic-kanban-board');
    if (board && shopData.columns) {
        board.innerHTML = ''; 
        const chanIcons = { 
            'discord': '<i class="bi bi-discord channel-icon"></i>', 
            'mail': '<i class="bi bi-envelope-heart channel-icon"></i>', 
            'kofi': '<img src="https://cdn.simpleicons.org/kofi/ff9cc1" style="width: 1.2em; height: 1.2em; margin-right: 6px; flex-shrink: 0; transform: translateY(-1px);" alt="Ko-fi">' 
        };

        shopData.columns.forEach(col => {
            const colItems = shopData.items.filter(i => i.column_id === col.id);
            let html = `<div class="kanban-col"><h3>${col.title}</h3>`;
            colItems.forEach(item => {
                html += `
                <div class="kanban-card searchable" onclick="openPublicItemModal(${item.id})">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center">
                            ${chanIcons[item.channel] || '<i class="bi bi-person channel-icon"></i>'}
                            <strong>${item.client_name}</strong>
                        </div>
                        <div style="display:flex; gap:6px">
                            <span class="tag-dot pay-${item.payment_status}" title="Pago"></span>
                            <span class="tag-dot status-${item.progress_status}" title="Progreso"></span>
                        </div>
                    </div>
                </div>`;
            });
            html += `</div>`; board.innerHTML += html;
        });
    }

    if (shopConfig) {
        const dosArray = currentLang === 'es' ? shopConfig.dos_es : shopConfig.dos_en;
        const dontsArray = currentLang === 'es' ? shopConfig.donts_es : shopConfig.donts_en;
        document.getElementById('list-dos').innerHTML = (dosArray || []).map(i => `<li>${i}</li>`).join('');
        document.getElementById('list-donts').innerHTML = (dontsArray || []).map(i => `<li>${i}</li>`).join('');
    }

    const { data: wishlistData } = await _client.from('wishlist').select('*').order('id', { ascending: false });
    const wGrid = document.getElementById('wishlist-grid');
    if (wGrid) {
        if (!wishlistData || wishlistData.length === 0) {
            wGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; text-align: center; color: #888;">${currentLang === 'es' ? 'No hay artículos en la wishlist por ahora 💖' : 'No wishlist items yet 💖'}</div>`;
        } else {
            wGrid.innerHTML = wishlistData.map(item => `
                <div class="card-item reveal" style="text-align: center; align-items: center;">
                    <img src="${item.image_url}" class="card-img" style="aspect-ratio: 1/1; object-fit: cover; margin-bottom: 10px;" onclick="openFullscreenImage('${item.image_url}')">
                    <h3 class="card-title" style="font-size: 0.9rem;">${item.title}</h3>
                    <div style="background: var(--white); border: 1px solid var(--primary-main); color: var(--primary-main); padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; margin-top: 5px;">
                        $${item.price} USD
                    </div>
                </div>
            `).join('');
        }
    }
}

window.scrollThumbnails = function(id, direction) {
    const container = document.getElementById(`thumb-container-${id}`);
    const scrollAmount = 100; 
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

window.swapPriceImage = function(mainImgId, newSrc) {
    document.getElementById(mainImgId).src = newSrc;
};

async function renderPricelist() {
    const container = document.getElementById('shop-commissions');
    if (!container) return;
    
    const anchoImagen = "250px";
    const paddingCuadro = "20px";
    
    const { data, error } = await _client.from('pricelist')
        .select('*')
        .eq('is_visible', true) 
        .order('position');
        
    if (error) return;

    let html = "";

    if (!data || data.length === 0) {
        html = `<div class="text-block searchable" data-i18n="shop_comm_info">${translations[currentLang]?.shop_comm_info || ''}</div>`;
    } else {
        data.forEach(item => {
            const title = currentLang === 'es' ? item.title_es : item.title_en;
            const desc = currentLang === 'es' ? item.desc_es : item.desc_en;
            const pricing = currentLang === 'es' ? item.pricing_data_es : item.pricing_data_en;
            const images = item.images || [];
            const mainImage = images.length > 0 ? images[0] : '';
            
            let buttonsHtml = '<div style="display: flex; gap: 8px; margin-top: 25px; flex-wrap: wrap; width: 100%;">';
            
            if (item.button_email !== false) {
                const btnText = currentLang === 'es' ? 'Solicitar' : 'Request';
                buttonsHtml += `<button onclick="openCommissionForm()" class="cute-btn" style="flex: 1 1 auto; justify-content: center;"><i class="bi bi-envelope-paper-heart" style="color: var(--primary-main);"></i> ${btnText}</button>`;
            }
            if (item.button_kofi) {
                buttonsHtml += `<a href="${item.button_kofi}" target="_blank" class="cute-btn" style="flex: 1 1 auto; justify-content: center;"><img src="https://cdn.simpleicons.org/kofi/ff9cc1" style="width: 1.2em; height: 1.2em; transform: translateY(-1px);"> Ko-fi <i class="bi bi-box-arrow-up-right" style="font-size: 0.75rem; opacity: 0.7; margin-left: 2px;"></i></a>`;
            }
            if (item.button_vgen) {
                buttonsHtml += `<a href="${item.button_vgen}" target="_blank" class="cute-btn" style="flex: 1 1 auto; justify-content: center;"><i class="bi bi-stars" style="color: var(--primary-main);"></i> VGen <i class="bi bi-box-arrow-up-right" style="font-size: 0.75rem; opacity: 0.7; margin-left: 2px;"></i></a>`;
            }
            buttonsHtml += '</div>';

            html += `
            <div class="glass-card reveal searchable" style="margin-bottom:35px; padding:${paddingCuadro};">
                <div class="pricelist-grid-container" style="display: grid; grid-template-columns: ${anchoImagen} 1fr; gap: 40px; align-items: start;">
                    <div>
                        <h3 style="font-family: 'Poppins'; font-size:1.2rem; color:var(--text-dark); margin-bottom:20px; text-transform: uppercase; font-weight: 800;">
                            ${title}
                        </h3>
                        <div style="border-radius: 15px; overflow: hidden; border: 2px solid var(--primary-light); margin-bottom: 15px;">
                            <img id="price-main-img-${item.id}" src="${mainImage}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; cursor: pointer; transition: transform 0.3s ease;" 
                                 onclick="openFullscreenImage(this.src)">
                        </div>
                        </div>
                    <div style="padding-top: 45px; display: flex; flex-direction: column;">
                        <div style="font-size:0.95rem; color:var(--text-light); margin-bottom:20px; white-space: pre-wrap; line-height: 1.6;">${desc || ''}</div>
                        <div style="border-radius:15px; overflow:hidden; background: var(--white); border: 1px solid var(--glass-border); box-shadow: 0 5px 20px rgba(255, 156, 193, 0.1);">
                            <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                                <thead>
                                    <tr style="background: var(--primary-light);">
                                        ${pricing.headers.map(h => `<th style="padding:12px; text-align:center;">${h}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pricing.rows.map(row => `<tr style="border-top: 1px dashed var(--glass-border);">${row.map(cell => `<td style="padding:12px; text-align:center;">${cell}</td>`).join('')}</tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                        ${buttonsHtml}
                    </div>
                </div>
            </div>`;
        });
    }
    
    container.innerHTML = html;
}

function translateLogMessage(msg, lang) {
    if (lang === 'en') return msg; 
    
    let translated = msg;
    translated = translated
        .replace("Order created.", "Pedido creado ✨")
        .replace("New preview image uploaded.", "Nueva vista previa subida 🎨")
        .replace("Preview image updated.", "Vista previa actualizada 🔄")
        .replace("Preview image removed.", "Vista previa eliminada 🗑️");
    
    const getEs = (dict, enTerm) => {
        const entry = Object.values(dict).find(v => v.en === enTerm);
        return entry ? entry.es : enTerm;
    };

    if (msg.startsWith("Progress: ")) {
        const parts = msg.replace("Progress: ", "").split(" ➔ ");
        if (parts.length === 2) translated = `Progreso: ${getEs(dynDicts.status, parts[0])} ➔ ${getEs(dynDicts.status, parts[1])}`;
    }
    if (msg.startsWith("Payment: ")) {
        const parts = msg.replace("Payment: ", "").split(" ➔ ");
        if (parts.length === 2) translated = `Pago: ${getEs(dynDicts.pay, parts[0])} ➔ ${getEs(dynDicts.pay, parts[1])}`;
    }
    if (msg.startsWith("Permissions: ")) {
        const parts = msg.replace("Permissions: ", "").split(" ➔ ");
        if (parts.length === 2) translated = `Permisos: ${getEs(dynDicts.perm, parts[0])} ➔ ${getEs(dynDicts.perm, parts[1])}`;
    }
    if (msg.startsWith("Status: ")) {
        const parts = msg.replace("Status: ", "").split(" ➔ ");
        if (parts.length === 2) translated = `Estado: ${parts[0]} ➔ ${parts[1]}`;
    }
    
    return translated;
}

function fillModalData(id) {
    const item = shopData.items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('public-item-client').innerText = item.client_name;
    document.getElementById('public-item-perms').innerText = dynDicts.perm[item.permission_level]?.[currentLang] || 'N/A';
    document.getElementById('public-item-progress').innerText = dynDicts.status[item.progress_status]?.[currentLang] || 'N/A';
    document.getElementById('public-item-payment').innerText = dynDicts.pay[item.payment_status]?.[currentLang] || 'N/A';
    document.getElementById('public-item-notes').innerText = item.notes ? item.notes : dynDicts.misc.no_notes[currentLang];

    const imgContainer = document.getElementById('public-image-container');
    if (item.image_url) {
        document.getElementById('public-item-image').src = item.image_url;
        imgContainer.style.display = 'block';
    } else { imgContainer.style.display = 'none'; }
}

window.openPublicItemModal = function(id) {
    currentOpenModalItemId = id; fillModalData(id); loadPublicItemHistory(id);
    document.getElementById('modal-public-item').style.display = 'flex';
};

async function loadPublicItemHistory(itemId) {
    const container = document.getElementById('public-item-history');
    container.innerHTML = `<p class="log-entry">${dynDicts.misc.loading_logs[currentLang]}</p>`;
    const { data, error } = await _client.from('item_logs').select('*').eq('item_id', itemId).order('created_at', { ascending: false });
    container.innerHTML = '';
    if (error || !data || data.length === 0) { container.innerHTML = `<p class="log-entry">${dynDicts.misc.no_logs[currentLang]}</p>`; return; }
    data.forEach(log => {
        container.innerHTML += `<div class="log-entry"><span class="log-date">${format24hDate(log.created_at, currentLang)}</span> ${translateLogMessage(log.message, currentLang)}</div>`;
    });
}

window.closePublicModal = function(modalId) {
    currentOpenModalItemId = null;
    document.getElementById(modalId).style.display = 'none';
};

window.switchTab = function(tabId, btnClicked) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll(`.nav-btn[onclick*="'${tabId}'"]`).forEach(b => b.classList.add('active'));
    document.getElementById('searchInput')?.value && (document.getElementById('searchInput').value = ''); filterContent();
};

window.switchSubTab = function(subTabId, btnClicked) {
    const parent = btnClicked.closest('.tab-content');
    parent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
    parent.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(subTabId).classList.add('active'); btnClicked.classList.add('active');
};

window.toggleFiltersUI = function() {
    const container = document.getElementById('filters-container');
    const btn = document.querySelector('.filter-toggle-btn');
    container.classList.toggle('show');
    btn.classList.toggle('active');
};

window.toggleFilter = function(category, value, btn) {
    const group = document.getElementById(`filter-${category}-group`);
    const allBtn = group.querySelector(`[onclick*="'all'"]`);

    if (value === 'all') {
        if (category === 'type') activeTypes = [];
        if (category === 'year') activeYears = [];
        group.querySelectorAll('.ui-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    } else {
        allBtn.classList.remove('active');
        btn.classList.toggle('active');
        let targetArray = (category === 'type') ? activeTypes : activeYears;
        if (btn.classList.contains('active')) { targetArray.push(value); } 
        else { const index = targetArray.indexOf(value); if (index > -1) targetArray.splice(index, 1); }
        if (targetArray.length === 0) { allBtn.classList.add('active'); }
    }

    const fanartTags = document.getElementById('fanart-tags');
    if(fanartTags) { fanartTags.style.display = (activeTypes.includes('Fanart')) ? 'flex' : 'none'; }
    if (!activeTypes.includes('Fanart')) { 
        activeTags = []; 
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active')); 
    }
    applyPortfolioFilters();
};

window.toggleTag = function(btn, tag) {
    btn.classList.toggle('active');
    activeTags = activeTags.includes(tag) ? activeTags.filter(t => t !== tag) : [...activeTags, tag];
    applyPortfolioFilters();
};

window.applyPortfolioFilters = function() {
    const filtered = misIlustraciones.filter(art => {
        const matchYear = (activeYears.length === 0) || activeYears.includes(art.año);
        const matchType = (activeTypes.length === 0) || activeTypes.includes(art.tipo);
        const matchTags = (activeTags.length === 0) || (activeTags.some(t => art.tags.includes(t)));
        return matchYear && matchType && matchTags;
    });
    renderPortfolio(filtered);
};

function renderMarquee(data) {
    const highlights = data.filter(art => art.destacado === true);
    const container = document.getElementById('highlights-container');
    const track = document.getElementById('marquee-track');
    
    if (!container || !track) return;
    if (highlights.length === 0) { container.style.display = 'none'; return; }
    
    container.style.display = 'block'; track.innerHTML = '';
    let html = '';
    highlights.forEach(art => {
        html += `<img src="${art.imagen}" class="marquee-item" onclick="openFullscreenImage('${art.imagen}')" style="object-position: ${art.object_position || '50% 50%'};" alt="${art.titulo}">`;
    });
    track.innerHTML = html + html; 
}

function renderPortfolio(data) {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    const fallbackMessage = translations[currentLang] && translations[currentLang].filter_empty ? translations[currentLang].filter_empty : "No hay resultados.";
    grid.innerHTML = data.length ? '' : `<div class="empty-state">${fallbackMessage}</div>`;
    
    data.forEach((art, index) => {
        let displayType = art.tipo;
        if (art.tipo === 'Comisión' && translations[currentLang] && translations[currentLang].filter_type_comm) { displayType = translations[currentLang].filter_type_comm; }
        
        const staggeredDelay = (index * 0.05) + 0.4;
        grid.innerHTML += `
            <div class="card-item searchable reveal" style="animation-delay: ${staggeredDelay}s">
                <div class="card-badge">${art.año}</div>
                <img src="${art.imagen}" class="card-img" alt="${art.titulo}" style="object-position: ${art.object_position || '50% 50%'};" onclick="openFullscreenImage('${art.imagen}')">
                <h3 class="card-title">${art.titulo}</h3>
                <p class="card-desc"><strong>${displayType}</strong> ${art.tags.length ? '| ' + art.tags.join(', ') : ''}</p>
            </div>`;
    });
}

function initMobileNav() {
    const mobileNav = document.querySelector('.mobile-nav-container');
    const bookmarkNav = document.querySelector('.bookmark-nav').innerHTML;
    if (mobileNav) mobileNav.innerHTML = bookmarkNav;
}

let zoomScale = 1; let maxAllowedZoom = 5; let isPanning = false; let startX = 0, startY = 0; let translateX = 0, translateY = 0;
let fullViewImg; let modalView;

document.addEventListener('DOMContentLoaded', () => {
    fullViewImg = document.getElementById('full-view-img');
    modalView = document.getElementById('modal-image-view');

    if (modalView && fullViewImg) {
        fullViewImg.onload = () => {
            const rect = fullViewImg.getBoundingClientRect();
            if (rect.width > 0 && fullViewImg.naturalWidth > 0) {
                maxAllowedZoom = Math.max(5, (fullViewImg.naturalWidth / rect.width) * 1.5);
            }
        };
        modalView.addEventListener('wheel', (e) => {
            if(modalView.style.display !== 'flex') return;
            e.preventDefault(); 
            const zoomSensitivity = 0.15;
            if (e.deltaY < 0) { zoomScale += zoomSensitivity; if(zoomScale > maxAllowedZoom) zoomScale = maxAllowedZoom; } 
            else { zoomScale -= zoomSensitivity; if(zoomScale < 0.5) zoomScale = 0.5; }
            updateImageTransform();
        }, {passive: false});
        fullViewImg.addEventListener('mousedown', (e) => {
            e.preventDefault(); isPanning = true; startX = e.clientX - translateX; startY = e.clientY - translateY;
        });
        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return; translateX = e.clientX - startX; translateY = e.clientY - startY; updateImageTransform();
        });
        window.addEventListener('mouseup', () => { isPanning = false; });
        fullViewImg.addEventListener('dragstart', (e) => e.preventDefault());
    }
});

window.openFullscreenImage = function(url) {
    if (!fullViewImg || !modalView) return;
    fullViewImg.src = url; modalView.style.display = 'flex';
    zoomScale = 1; translateX = 0; translateY = 0; updateImageTransform();
};

window.closeFullscreenImage = function(e) {
    if (e && e.target === fullViewImg) return;
    window.forceCloseFullscreen();
};
window.forceCloseFullscreen = function() {
    if (!modalView) return;
    modalView.style.display = 'none'; fullViewImg.src = '';
};
function updateImageTransform() {
    if (!fullViewImg) return;
    fullViewImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`;
}

window.onscroll = function() {
    const btn = document.getElementById("backToTop");
    if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) { btn.classList.add("show"); } else { btn.classList.remove("show"); }
};
function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

async function renderLegalDocs() {
    const container = document.getElementById('tos-dynamic-container');
    if (!container) return;

    const loadingMsg = currentLang === 'es' ? 'Cargando políticas legales...' : 'Loading legal policies...';
    container.innerHTML = `<p class="loading-text" style="text-align: center; padding: 20px;"><i class="bi bi-arrow-repeat spin"></i> ${loadingMsg}</p>`;

    try {
        const { data: docData, error } = await _client.from('legal_docs').select('content').eq('lang', currentLang).single();
        if (error || !docData) throw new Error("Documento no encontrado");

        container.innerHTML = ''; 
        docData.content.sections.forEach((section, index) => {
            const num = String(index + 1).padStart(2, '0');
            const itemDiv = document.createElement('div');
            itemDiv.className = 'accordion-item reveal';
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'accordion-header';
            headerDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="color: var(--primary-main); font-weight: 900; font-size: 1.15rem;">${num}.</span> 
                    ${section.title}
                </div><i class="bi bi-chevron-down acc-arrow"></i>`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'accordion-content';

            if (section.type === 'list') {
                const ul = document.createElement('ul'); ul.className = 'tos-star-list';
                section.content.forEach(txt => ul.innerHTML += `<li>${txt}</li>`);
                contentDiv.appendChild(ul);
            } else if (section.type === 'accordion') {
                section.items.forEach(faq => {
                    contentDiv.innerHTML += `
                        <div class="accordion-item nested-accordion">
                            <div class="accordion-header nested-header" onclick="this.parentElement.classList.toggle('open')">
                                <div style="font-weight: 600;">${faq.q}</div>
                                <i class="bi bi-chevron-down acc-arrow" style="font-size: 0.9rem;"></i>
                            </div>
                            <div class="accordion-content nested-content">${faq.a}</div>
                        </div>`;
                });
            }
            headerDiv.onclick = () => itemDiv.classList.toggle('open');
            itemDiv.appendChild(headerDiv); itemDiv.appendChild(contentDiv); container.appendChild(itemDiv);
        });
    } catch (e) {
        const errorMsg = currentLang === 'es' ? 'Error al cargar las políticas.' : 'Error loading policies.';
        container.innerHTML = `<p style="text-align: center; padding: 20px; color: var(--warning-peach);">${errorMsg}</p>`;
    }
}

window.openCommissionForm = function() {
    const urlES = "https://tally.so/embed/PdBpEQ?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";
    const urlEN = "https://tally.so/embed/44NQXA?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";
    const finalUrl = currentLang === 'es' ? urlES : urlEN;
    
    const modalTitle = document.getElementById('form-modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = currentLang === 'es' ? '<i class="bi bi-stars"></i> Solicitar Comisión' : '<i class="bi bi-stars"></i> Request Commission';
    }
    
    document.getElementById('form-iframe').src = finalUrl;
    document.getElementById('commission-modal').style.display = 'flex';
};

window.closeCommissionForm = function() {
    document.getElementById('commission-modal').style.display = 'none';
    setTimeout(() => { document.getElementById('form-iframe').src = ""; }, 300);
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('commission-modal')?.style.display === 'flex') closeCommissionForm();
        if (document.getElementById('modal-public-item')?.style.display === 'flex') closePublicModal('modal-public-item');
        if (document.getElementById('modal-image-view')?.style.display === 'flex') forceCloseFullscreen();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'commission-modal') closeCommissionForm();
        else if (e.target.id === 'modal-public-item') closePublicModal('modal-public-item');
        else if (e.target.id === 'modal-image-view') forceCloseFullscreen();
    }
});