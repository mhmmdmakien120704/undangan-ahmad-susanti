// 1. AMBIL NAMA TAMU OTOMATIS DARI LINK (?guest=Nama+Tamu atau ?to=Nama+Tamu)
const urlParams = new URLSearchParams(window.location.search);
const guestParam = urlParams.get('guest') || urlParams.get('to');
if (guestParam) {
    document.getElementById('guestName').textContent = guestParam;
}

// 2. BUKA UNDANGAN (SAMPUL -> HALAMAN VIDEO)
const coverSection = document.getElementById('coverSection');
const mainInvitation = document.getElementById('mainInvitation');
const openBtn = document.getElementById('openBtn');
const bgMusic = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');
const videos = Array.from(document.querySelectorAll('.scroll-video'));

let isPlaying = false;

// Muat 1 video berikutnya secara berantai agar jaringan & RAM HP tetap ringan
function preloadNextVideo(currentIndex) {
    const nextVideo = videos[currentIndex + 1];
    if (nextVideo && nextVideo.preload !== 'auto') {
        nextVideo.preload = 'auto';
        nextVideo.load();
    }
}

openBtn.addEventListener('click', () => {
    // Tampilkan daftar video & buka kunci scroll
    mainInvitation.classList.remove('hidden');
    document.body.classList.remove('lock-scroll');
    window.scrollTo(0, 0);

    // Hilangkan sampul gambar dengan transisi halus
    coverSection.classList.add('fade-out');
    setTimeout(() => {
        coverSection.classList.add('hidden');
    }, 700);

    // Putar musik latar
    bgMusic.play().then(() => {
        isPlaying = true;
        musicToggle.classList.remove('hidden');
    }).catch(() => { });

    // Langsung putar Video 1 saat sampul terbuka & siapkan Video 2
    if (videos.length > 0 && !videos[0].dataset.played) {
        videos[0].dataset.played = 'true';
        videos[0].play().catch(() => { });
        preloadNextVideo(0);
    }
});

// Kontrol tombol mute/unmute musik
musicToggle.addEventListener('click', () => {
    if (isPlaying) {
        bgMusic.pause();
        musicToggle.textContent = '🔇';
    } else {
        bgMusic.play();
        musicToggle.textContent = '🔊';
    }
    isPlaying = !isPlaying;
});

// 3. DETEKSI VIDEO SAAT TAMPIL DI LAYAR (Putar 1x lalu stay di frame akhir)
const observerOptions = {
    root: null,
    rootMargin: '250px 0px 250px 0px',
    threshold: 0.05
};

const videoObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
        const video = entry.target;
        const index = videos.indexOf(video);

        // Jika video masuk ke layar dan BELUM pernah diputar sebelumnya
        if (entry.isIntersecting && !video.dataset.played) {
            video.dataset.played = 'true';
            video.preload = 'auto';
            video.play().catch(() => { });

            // Siapkan video selanjutnya di latar belakang
            if (index !== -1) {
                preloadNextVideo(index);
            }

            // Berhenti memantau video ini agar tidak reset/loop saat di-scroll ulang
            observer.unobserve(video);
        }
    });
}, observerOptions);

// Daftarkan semua video ke observer
videos.forEach((video) => {
    videoObserver.observe(video);
});

// 4. LOGIKA COUNTDOWN MENUJU 26 DESEMBER 2026
const targetDate = new Date('2026-12-26T08:00:00+07:00').getTime();

function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
        document.getElementById('cd-days').textContent = '00';
        document.getElementById('cd-hours').textContent = '00';
        document.getElementById('cd-minutes').textContent = '00';
        document.getElementById('cd-seconds').textContent = '00';
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);

// 5. LOGIKA COPY NOMOR REKENING (TANPA MEMUNCULKAN KEYBOARD HP)
const copyRekBtn = document.getElementById('copyRekBtn');
const copyToast = document.getElementById('copyToast');

if (copyRekBtn) {
    copyRekBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const noRek = copyRekBtn.getAttribute('data-rekening');

        // 1. Gunakan Clipboard API modern terlebih dahulu (100% tanpa keyboard di Vercel/HTTPS)
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(noRek);
                showToast();
                return;
            } catch (err) {
                // Lanjut ke fallback jika diblokir browser
            }
        }

        // 2. Fallback aman untuk HTTP lokal/localhost (readonly + tanpa focus() agar keyboard tidak muncul)
        const textArea = document.createElement('textarea');
        textArea.value = noRek;
        textArea.setAttribute('readonly', '');
        textArea.inputMode = 'none';
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);

        // Khusus iOS Safari & Android tanpa memicu keyboard
        const selection = document.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textArea);
        selection.removeAllRanges();
        selection.addRange(range);
        textArea.setSelectionRange(0, 999999);

        try {
            document.execCommand('copy');
            showToast();
        } catch (err) {
            console.error('Gagal menyalin:', err);
        }

        selection.removeAllRanges();
        document.body.removeChild(textArea);
    });
}

function showToast() {
    if (!copyToast) return;
    copyToast.classList.add('show');
    setTimeout(() => {
        copyToast.classList.remove('show');
    }, 2500);
}

// 6. LOGIKA UCAPAN SELAMAT & RSVP (TERHUBUNG KE GOOGLE SHEETS)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxo92ty-teDw-gdx-AREkEKeL-OvtSI4n-ie1Da5okgFcIjXXBuLB076_YVNHu_yo0fjA/exec';

const rsvpForm = document.getElementById('rsvpForm');
const commentList = document.getElementById('commentList');
const totalCommentsEl = document.getElementById('totalComments');
const countHadirEl = document.getElementById('countHadir');
const countTidakHadirEl = document.getElementById('countTidakHadir');
const submitRsvpBtn = document.getElementById('submitRsvpBtn');

// Otomatis isi kolom Nama jika tamu membuka link pakai ?guest=NamaTamu
if (guestParam && document.getElementById('inputNama')) {
    document.getElementById('inputNama').value = guestParam;
}

// Ambil dan tampilkan seluruh ucapan dari Google Sheets
async function loadComments() {
    if (!SCRIPT_URL.startsWith('http')) {
        commentList.innerHTML = '<p class="loading-text">Belum terhubung ke Google Sheets.</p>';
        return;
    }

    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();

        let hadir = 0;
        let tidakHadir = 0;
        commentList.innerHTML = '';

        data.forEach((item) => {
            if (item.kehadiran === 'Hadir') hadir++;
            else if (item.kehadiran === 'Tidak Hadir') tidakHadir++;

            const statusClass = item.kehadiran === 'Hadir' ? 'Hadir' : 'Tidak';
            const card = document.createElement('div');
            card.className = 'comment-item';
            card.innerHTML = `
                <div class="comment-header">
                    <span class="comment-name">${escapeHtml(item.nama)}</span>
                    <span class="badge-status ${statusClass}">${escapeHtml(item.kehadiran)}</span>
                </div>
                <p class="comment-text">${escapeHtml(item.ucapan)}</p>
                <span class="comment-time">${escapeHtml(item.waktu)}</span>
            `;
            commentList.appendChild(card);
        });

        totalCommentsEl.textContent = data.length;
        countHadirEl.textContent = hadir;
        countTidakHadirEl.textContent = tidakHadir;

        if (data.length === 0) {
            commentList.innerHTML = '<p class="loading-text">Jadilah yang pertama memberikan ucapan!</p>';
        }
    } catch (err) {
        commentList.innerHTML = '<p class="loading-text">Gagal memuat ucapan.</p>';
    }
}

// Kirim ucapan baru
if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nama = document.getElementById('inputNama').value.trim();
        const ucapan = document.getElementById('inputUcapan').value.trim();
        const kehadiran = document.getElementById('inputKehadiran').value;

        if (!nama || !ucapan || !kehadiran) return;

        submitRsvpBtn.disabled = true;
        submitRsvpBtn.textContent = 'Mengirim...';

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama, ucapan, kehadiran })
            });

            document.getElementById('inputUcapan').value = '';
            document.getElementById('inputKehadiran').value = '';

            // Muat ulang daftar komentar setelah 1 detik
            setTimeout(loadComments, 1000);
        } catch (err) {
            alert('Terjadi kesalahan saat mengirim ucapan.');
        } finally {
            submitRsvpBtn.disabled = false;
            submitRsvpBtn.textContent = 'Kirim';
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Muat komentar saat halaman pertama kali dibuka
loadComments();

// 7. LOGIKA BUKA GOOGLE MAPS (VIDEO 5 & VIDEO 6)
const mapButtons = document.querySelectorAll('.invisible-map-btn');

mapButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const mapUrl = btn.getAttribute('data-map');
        if (mapUrl) {
            window.open(mapUrl, '_blank', 'noopener,noreferrer');
        }
    });
});