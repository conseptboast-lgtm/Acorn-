// ============================================================
// ===== SESSION HELPERS =====
// ============================================================
function getUserId() {
    return localStorage.getItem('zeon_currentUser');
}

function setUserId(id) {
    localStorage.setItem('zeon_currentUser', id);
}

function logoutUser() {
    if (confirm('Logout?')) {
        localStorage.removeItem('zeon_currentUser');
        window.location.href = 'login.html';
    }
}

// ============================================================
// ===== REGISTRATION =====
// ============================================================
let currentCode = '';
let avatarData = '';

function goToStep2() {
    const fullName = document.getElementById('regFullName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    const agree = document.getElementById('agreeTerms').checked;
    const msg = document.getElementById('registerMessage');

    if (!fullName || !phone || !password || !confirm) {
        msg.textContent = '❌ Please fill all fields';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (password !== confirm) {
        msg.textContent = '❌ Passwords do not match';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (password.length < 6) {
        msg.textContent = '❌ Password must be at least 6 characters';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (!agree) {
        msg.textContent = '❌ Please agree to the terms';
        msg.style.color = '#ff6b6b';
        return;
    }

    localStorage.setItem('zeon_pending', JSON.stringify({
        fullName: fullName,
        phone: phone,
        password: password
    }));

    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    generateCode();
}

function backToStep1() {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2Message').textContent = '';
}

function generateCode() {
    currentCode = Math.floor(1000 + Math.random() * 9000).toString();
    const el = document.getElementById('codeDisplay');
    if (el) el.textContent = currentCode;
    const inp = document.getElementById('codeInput');
    if (inp) inp.value = '';
}

function previewAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        alert('Image must be under 2MB');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        avatarData = e.target.result;
        const preview = document.getElementById('avatarPreview');
        preview.innerHTML = '<img src="' + e.target.result + '" alt="avatar" />';
    };
    reader.readAsDataURL(file);
}

async function finishRegistration() {
    const entered = document.getElementById('codeInput').value.trim();
    const msg = document.getElementById('step2Message');

    if (!avatarData) {
        msg.textContent = '❌ Please upload a profile picture';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (!entered) {
        msg.textContent = '❌ Please enter the verification code';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (entered !== currentCode) {
        msg.textContent = '❌ Wrong code. Try again';
        msg.style.color = '#ff6b6b';
        generateCode();
        return;
    }

    const pending = JSON.parse(localStorage.getItem('zeon_pending') || '{}');
    if (!pending.phone) {
        msg.textContent = '❌ Session expired. Start over.';
        msg.style.color = '#ff6b6b';
        return;
    }

    msg.textContent = '⏳ Creating account...';
    msg.style.color = '#a78bfa';

    let referredBy = null;
    const refCode = new URLSearchParams(window.location.search).get('ref');
    if (refCode) {
        const refUsers = await dbGetUsers();
        const referrer = refUsers.find(u => u.referralCode === refCode);
        if (referrer) referredBy = referrer.userId;
    }

    const newUser = {
        userId: pending.phone,
        fullName: pending.fullName,
        phone: pending.phone,
        password: pending.password,
        avatar: avatarData,
        bank: null,
        pin: null,
        currentLevel: 'Rox 0',
        balance: 10000,
        totalEarned: 0,
        todayProfit: 0,
        yesterdayProfit: 0,
        totalProfit: 0,
        tasksCompletedToday: 0,
        lastTaskDate: new Date().toISOString().split('T')[0],
        registrationDate: new Date().toISOString().split('T')[0],
        referralCode: pending.fullName.toUpperCase().substring(0, 5) + '-' +
            Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        referredBy: referredBy,
        referralCount: 0,
        referralEarnings: 0
    };

    const created = await dbCreateUser(newUser);

    if (!created) {
        msg.textContent = '❌ Registration failed. Try a different phone number.';
        msg.style.color = '#ff6b6b';
        return;
    }

    if (referredBy) {
        const referrer = await dbGetUser(referredBy);
        if (referrer) {
            await dbUpdateUser(referredBy, {
                referralCount: (referrer.referralCount || 0) + 1,
                balance: (referrer.balance || 0) + 200,
                referralEarnings: (referrer.referralEarnings || 0) + 200
            });
        }
    }

    localStorage.removeItem('zeon_pending');
    msg.textContent = '✅ Registration complete!';
    msg.style.color = '#4CAF50';

    setTimeout(function() {
        setUserId(pending.phone);
        window.location.href = 'index.html';
    }, 1200);
}

// ============================================================
// ===== LOGIN =====
// ============================================================
let loginCode = '';

function generateLoginCode() {
    loginCode = Math.floor(1000 + Math.random() * 9000).toString();
    const el = document.getElementById('loginCodeDisplay');
    if (el) el.textContent = loginCode;
    const inp = document.getElementById('loginCode');
    if (inp) inp.value = '';
}

async function loginUser() {
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    const code = document.getElementById('loginCode').value.trim();
    const human = document.getElementById('humanCheck').checked;
    const msg = document.getElementById('loginMessage');

    if (!phone || !password || !code) {
        msg.textContent = '❌ Please fill all fields';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (code !== loginCode) {
        msg.textContent = '❌ Wrong verification code';
        msg.style.color = '#ff6b6b';
        generateLoginCode();
        return;
    }
    if (!human) {
        msg.textContent = '❌ Please confirm you are a human';
        msg.style.color = '#ff6b6b';
        return;
    }

    msg.textContent = '⏳ Logging in...';
    msg.style.color = '#a78bfa';

    const user = await dbGetUser(phone);

    if (!user || user.password !== password) {
        msg.textContent = '❌ Wrong phone number or password';
        msg.style.color = '#ff6b6b';
        return;
    }

    msg.textContent = '✅ Login successful!';
    msg.style.color = '#4CAF50';
    setTimeout(function() {
        setUserId(phone);
        window.location.href = 'index.html';
    }, 800);
}

// ============================================================
// ===== DRAWER MENU =====
// ============================================================
function openDrawer() {
    const d = document.getElementById('drawer');
    const o = document.getElementById('drawerOverlay');
    if (d) d.classList.add('open');
    if (o) o.classList.add('open');
}

function closeDrawer() {
    const d = document.getElementById('drawer');
    const o = document.getElementById('drawerOverlay');
    if (d) d.classList.remove('open');
    if (o) o.classList.remove('open');
}

// ============================================================
// ===== ONLINE SERVICE (TAWK.TO) =====
// ============================================================
function openOnlineService() {
    // If Tawk.to is loaded, use it
    if (typeof Tawk_API !== 'undefined' && Tawk_API) {
        try {
            if (Tawk_API.showWidget) Tawk_API.showWidget();
            if (Tawk_API.maximize) Tawk_API.maximize();
            return;
        } catch (e) {
            console.warn('Tawk.to error:', e);
        }
    }

    // Not loaded yet — retry for 6 seconds
    var tries = 0;
    var iv = setInterval(function() {
        tries++;
        if (typeof Tawk_API !== 'undefined' && Tawk_API) {
            clearInterval(iv);
            try {
                if (Tawk_API.showWidget) Tawk_API.showWidget();
                if (Tawk_API.maximize) Tawk_API.maximize();
            } catch (e) {
                console.warn('Tawk.to error:', e);
            }
        } else if (tries >= 12) {
            // After 6 seconds, fallback to Telegram
            clearInterval(iv);
            if (confirm('Live chat is not loading.\n\nOpen Telegram instead?')) {
                window.open('https://t.me/Aeoncharle', '_blank');
            }
        }
    }, 500);
}

function joinWaGroup() {
    window.open('https://chat.whatsapp.com/FV6rtPNGaag0e7C44T4BWb', '_blank');
}

// ============================================================
// ===== SLIDING BANNER =====
// ============================================================
let bannerIndex = 0;

function startBanner() {
    const track = document.getElementById('bannerTrack');
    const dots = document.querySelectorAll('.bd');
    if (!track || dots.length === 0) return;

    const total = track.children.length;

    function go(i) {
        bannerIndex = (i + total) % total;
        track.style.transform = 'translateX(-' + (bannerIndex * 100) + '%)';
        dots.forEach(function(d, k) {
            d.classList.toggle('active', k === bannerIndex);
        });
    }

    setInterval(function() { go(bannerIndex + 1); }, 3500);

    dots.forEach(function(d, k) {
        d.addEventListener('click', function() { go(k); });
    });
}

// ============================================================
// ===== DEPOSIT =====
// ============================================================
let countdownTimer = null;
let pendingDeposit = null;

function processDeposit() {
    const amount = parseInt(document.getElementById('depositAmount').value);
    const payOption = document.querySelector('input[name="payOption"]:checked');
    const msg = document.getElementById('depositMessage');

    if (!amount || amount < 100) {
        msg.textContent = '❌ Enter an amount (minimum ₦100)';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (!payOption) {
        msg.textContent = '❌ Please select a payment option';
        msg.style.color = '#ff6b6b';
        return;
    }

    pendingDeposit = { amount: amount, payMethod: payOption.value };

    document.getElementById('screenForm').style.display = 'none';
    document.getElementById('screenBank').style.display = 'block';

    startCountdown(14 * 60 + 28);
}

function startCountdown(seconds) {
    clearInterval(countdownTimer);
    let remaining = seconds;

    function tick() {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        const el = document.getElementById('countdown');
        if (el) {
            el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
            if (remaining <= 60) el.classList.add('warning');
        }
        if (remaining <= 0) {
            clearInterval(countdownTimer);
            if (el) el.textContent = '00:00';
        }
        remaining--;
    }

    tick();
    countdownTimer = setInterval(tick, 1000);
}

function copyBank(text, btn) {
    navigator.clipboard.writeText(text).then(function() {
        if (btn) {
            const original = btn.textContent;
            btn.textContent = 'COPIED ✓';
            btn.style.color = '#22c55e';
            btn.style.borderColor = 'rgba(34, 197, 94, 0.6)';
            setTimeout(function() {
                btn.textContent = original;
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 1500);
        }
    });
}

async function handlePaidCheck(el) {
    if (!el.checked) return;
    el.disabled = true;

    document.getElementById('screenBank').style.display = 'none';
    document.getElementById('screenProcessing').style.display = 'block';

    setTimeout(function() {
        const fill = document.getElementById('progressFill');
        if (fill) fill.style.width = '100%';
    }, 100);

    setTimeout(async function() {
        const now = new Date();
        const date = now.toLocaleDateString('en-GB');
        const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const userId = getUserId();

        await dbCreateDeposit({
            userId: userId,
            amount: pendingDeposit.amount,
            payMethod: pendingDeposit.payMethod,
            status: 'Pending',
            date: date,
            time: time
        });

        document.getElementById('screenProcessing').style.display = 'none';
        document.getElementById('screenSent').style.display = 'block';
    }, 3400);
}

// ============================================================
// ===== WITHDRAW =====
// ============================================================
function startWithdrawTimer() {
    const el = document.getElementById('wdTimer');
    if (!el) return;
    let remaining = 83;

    function tick() {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        if (remaining <= 0) { el.textContent = '00:00'; return; }
        remaining--;
        setTimeout(tick, 1000);
    }
    tick();
}

async function submitWithdraw() {
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const pin = document.getElementById('withdrawPin').value;
    const msg = document.getElementById('withdrawMessage');

    const userId = getUserId();
    const user = await dbGetUser(userId);

    if (!user) { msg.textContent = '❌ User not found'; msg.style.color = '#ff6b6b'; return; }
    if (!user.bank || !user.bank.accountNumber) { msg.textContent = '❌ Please add a bank first'; msg.style.color = '#ff6b6b'; return; }
    if (!user.pin) { msg.textContent = '❌ Please set a transaction pin first'; msg.style.color = '#ff6b6b'; return; }
    if (!amount || amount < 500) { msg.textContent = '❌ Minimum withdrawal is ₦500'; msg.style.color = '#ff6b6b'; return; }
    if (!pin || pin.length !== 4) { msg.textContent = '❌ Please enter your 4-digit pin'; msg.style.color = '#ff6b6b'; return; }
    if (pin !== user.pin) { msg.textContent = '❌ Incorrect pin. Try again.'; msg.style.color = '#ff6b6b'; document.getElementById('withdrawPin').value = ''; return; }
    if (amount > (user.balance || 0)) { msg.textContent = '❌ Insufficient funds. Your balance: ₦' + (user.balance || 0).toLocaleString(); msg.style.color = '#ff6b6b'; return; }

    msg.textContent = '⏳ Processing...';
    msg.style.color = '#a78bfa';

    const now = new Date();
    const date = now.toLocaleDateString('en-GB');
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    await dbCreateWithdrawal({
        userId: userId,
        amount: amount,
        bank: user.bank,
        status: 'Pending',
        date: date,
        time: time
    });

    await dbUpdateUser(userId, {
        balance: (user.balance || 0) - amount
    });

    msg.textContent = '✅ Withdrawal submitted! Await approval.';
    msg.style.color = '#4CAF50';
    document.getElementById('withdrawAmount').value = '';
    document.getElementById('withdrawPin').value = '';

    const balEl = document.getElementById('withdrawBalance');
    if (balEl) balEl.textContent = ((user.balance || 0) - amount).toLocaleString();

    setTimeout(function() { window.location.href = 'withdraw-record.html'; }, 1300);
}

// ============================================================
// ===== ADD BANK =====
// ============================================================
async function updateBank() {
    const accountNumber = document.getElementById('accountNumber').value.trim();
    const accountName = document.getElementById('accountName').value.trim();
    const bankName = document.getElementById('bankName').value.trim();
    const msg = document.getElementById('bankUpdateMessage');

    if (!accountNumber || !accountName || !bankName) {
        msg.textContent = '❌ Please fill all fields';
        msg.style.color = '#ff6b6b';
        return;
    }

    const userId = getUserId();
    await dbUpdateUser(userId, {
        bank: { accountNumber, accountName, bankName }
    });

    document.getElementById('updatePopup').style.display = 'flex';
    document.getElementById('updatingView').style.display = 'flex';
    document.getElementById('updatedView').style.display = 'none';

    setTimeout(function() {
        document.getElementById('updatingView').style.display = 'none';
        document.getElementById('updatedView').style.display = 'flex';
    }, 2000);
}

function goBackFromPopup() {
    document.getElementById('updatePopup').style.display = 'none';
    window.location.href = 'withdraw.html';
}

// ============================================================
// ===== SECURE PIN =====
// ============================================================
async function updatePin() {
    const pin = document.getElementById('setPin').value.trim();
    const confirm = document.getElementById('confirmPin').value.trim();
    const msg = document.getElementById('pinMessage');

    if (!pin || pin.length !== 4) {
        msg.textContent = '❌ Pin must be 4 digits';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (pin !== confirm) {
        msg.textContent = '❌ Pins do not match';
        msg.style.color = '#ff6b6b';
        return;
    }

    const userId = getUserId();
    await dbUpdateUser(userId, { pin: pin });

    document.getElementById('pinPopup').style.display = 'flex';
    document.getElementById('pinUpdatingView').style.display = 'flex';
    document.getElementById('pinUpdatedView').style.display = 'none';

    setTimeout(function() {
        document.getElementById('pinUpdatingView').style.display = 'none';
        document.getElementById('pinUpdatedView').style.display = 'flex';
    }, 2000);
}

function closePinPopup() {
    document.getElementById('pinPopup').style.display = 'none';
    window.location.href = 'profile.html';
}

// ============================================================
// ===== PROFILE =====
// ============================================================
let newProfileAvatar = null;

function previewProfileAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        alert('Image must be under 2MB');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        newProfileAvatar = e.target.result;
        const preview = document.getElementById('profileAvatarPreview');
        preview.innerHTML = '<img src="' + e.target.result + '" alt="avatar" />';
    };
    reader.readAsDataURL(file);
}

async function updateProfile() {
    const newPhone = document.getElementById('newPhone').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const newName = document.getElementById('newName').value.trim();
    const msg = document.getElementById('profileMessage');

    if (!newPhone && !newPassword && !newName && !newProfileAvatar) {
        msg.textContent = '❌ Change at least one field';
        msg.style.color = '#ff6b6b';
        return;
    }
    if (newPassword && newPassword.length < 6) {
        msg.textContent = '❌ Password must be at least 6 characters';
        msg.style.color = '#ff6b6b';
        return;
    }

    const userId = getUserId();
    const user = await dbGetUser(userId);
    if (!user) { msg.textContent = '❌ User not found'; msg.style.color = '#ff6b6b'; return; }

    const updates = {};
    if (newProfileAvatar) updates.avatar = newProfileAvatar;
    if (newName) updates.fullName = newName;
    if (newPassword) updates.password = newPassword;

    if (newPhone && newPhone !== user.phone) {
        const taken = await dbGetUser(newPhone);
        if (taken) {
            msg.textContent = '❌ This phone number is already in use';
            msg.style.color = '#ff6b6b';
            return;
        }
        updates.phone = newPhone;
        updates.userId = newPhone;
        setUserId(newPhone);
    }

    await dbUpdateUser(userId, updates);

    document.getElementById('profilePopup').style.display = 'flex';
    document.getElementById('profileUpdatingView').style.display = 'flex';
    document.getElementById('profileUpdatedView').style.display = 'none';

    setTimeout(function() {
        document.getElementById('profileUpdatingView').style.display = 'none';
        document.getElementById('profileUpdatedView').style.display = 'flex';
    }, 2000);
}

function closeProfilePopup() {
    document.getElementById('profilePopup').style.display = 'none';
    window.location.href = 'index.html';
}

// ============================================================
// ===== RECORDS =====
// ============================================================
function renderRecord(item) {
    let statusClass = 'status-pending';
    if (item.status === 'Approved') statusClass = 'status-approved';
    if (item.status === 'Failed') statusClass = 'status-failed';

    const datetime = (item.date || '') + ' • ' + (item.time || '--:--');

    return '<div class="record-item">' +
        '<div class="record-top">' +
            '<div class="record-amount">₦' + item.amount.toLocaleString() + '</div>' +
            '<div class="record-status-badge ' + statusClass + '">' + item.status + '</div>' +
        '</div>' +
        '<div class="record-bottom">' +
            '<span class="record-label">Date & Time</span>' +
            '<span class="record-datetime">' + datetime + '</span>' +
        '</div>' +
    '</div>';
}

async function loadDepositRecords() {
    const list = document.getElementById('depositRecords');
    const empty = document.getElementById('emptyMsg');
    if (!list) return;

    const userId = getUserId();
    if (!userId) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    const data = await dbGetDeposits();
    const mine = (data || []).filter(function(d) { return d.userId === userId; });

    if (mine.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';
    list.innerHTML = mine.map(renderRecord).join('');
}

async function loadWithdrawRecords() {
    const list = document.getElementById('withdrawRecords');
    const empty = document.getElementById('emptyMsg');
    if (!list) return;

    const userId = getUserId();
    if (!userId) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    const data = await dbGetWithdrawals();
    const mine = (data || []).filter(function(w) { return w.userId === userId; });

    if (mine.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';
    list.innerHTML = mine.map(renderRecord).join('');
}

// ============================================================
// ===== PAGE LOAD HANDLER =====
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    const page = window.location.pathname.split('/').pop() || 'index.html';

    if (page === 'login.html') {
        generateLoginCode();
    }

    if (page === 'register.html') {
        const ref = new URLSearchParams(window.location.search).get('ref');
        if (ref) {
            const inp = document.getElementById('regReferralCode');
            if (inp) { inp.value = ref; inp.style.borderColor = '#4CAF50'; }
        }
    }

    if (page === 'index.html' || page === '') {
        const userId = getUserId();
        if (!userId) {
            window.location.href = 'login.html';
            return;
        }

        async function loadDashboard() {
            const user = await dbGetUser(userId);
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            const nameEl = document.getElementById('userName');
            const avatarEl = document.getElementById('dashAvatar');
            const todayEl = document.getElementById('todayProfit');
            const yestEl = document.getElementById('yesterdayProfit');
            const totalEl = document.getElementById('totalProfit');

            if (nameEl) nameEl.textContent = user.fullName;
            if (todayEl) todayEl.textContent = '₦' + (user.todayProfit || 0).toLocaleString();
            if (yestEl) yestEl.textContent = '₦' + (user.yesterdayProfit || 0).toLocaleString();
            if (totalEl) totalEl.textContent = '₦' + (user.totalProfit || 0).toLocaleString();

            if (avatarEl && user.avatar) {
                avatarEl.innerHTML = '<img src="' + user.avatar + '" alt="avatar" />';
            } else if (avatarEl) {
                avatarEl.textContent = (user.fullName || 'Z').charAt(0).toUpperCase();
            }
        }

        await loadDashboard();
        startBanner();
        setInterval(loadDashboard, 5000);
    }

    if (page === 'deposit-record.html') {
        loadDepositRecords();
    }

    if (page === 'withdraw-record.html') {
        loadWithdrawRecords();
    }

    if (page === 'withdraw.html') {
        startWithdrawTimer();

        const userId = getUserId();
        if (userId) {
            const user = await dbGetUser(userId);
            if (user) {
                const balEl = document.getElementById('withdrawBalance');
                if (balEl) balEl.textContent = (user.balance || 0).toLocaleString();

                const transferSec = document.getElementById('transferSection');
                const noBankHint = document.getElementById('noBankHint');

                if (user.bank && user.bank.accountNumber) {
                    if (transferSec) {
                        transferSec.style.display = 'block';
                        document.getElementById('trBankName').textContent = user.bank.bankName;
                        document.getElementById('trAccountName').textContent = user.bank.accountName;
                        document.getElementById('trAccountNumber').textContent = user.bank.accountNumber;
                    }
                    if (noBankHint) noBankHint.style.display = 'none';
                } else {
                    if (transferSec) transferSec.style.display = 'none';
                    if (noBankHint) noBankHint.style.display = 'block';
                }
            }
        }
    }

    if (page === 'profile.html') {
        const userId = getUserId();
        if (userId) {
            const user = await dbGetUser(userId);
            if (user) {
                const greetEl = document.getElementById('profileGreetName');
                if (greetEl) greetEl.textContent = user.fullName;

                if (user.avatar) {
                    const preview = document.getElementById('profileAvatarPreview');
                    if (preview) preview.innerHTML = '<img src="' + user.avatar + '" alt="avatar" />';
                    newProfileAvatar = user.avatar;
                }
            }
        }
    }
});