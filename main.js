// ============ Exact Probability Calculation (Markov Chain) ============
const transitionCache = {};

function allRolls(count) {
    const rolls = [];
    const current = new Array(count);
    function rec(pos) {
        if (pos === count) {
            rolls.push([...current]);
            return;
        }
        for (let v = 1; v <= 6; v++) {
            current[pos] = v;
            rec(pos + 1);
        }
    }
    rec(0);
    return rolls;
}

function computeTransition(k, l) {
    const key = `${k},${l}`;
    if (transitionCache[key]) return transitionCache[key];

    const n = Math.min(k, l);
    const lossesCounts = new Array(n + 1).fill(0);
    const attackerRolls = allRolls(k);
    const defenderRolls = allRolls(l);
    const total = attackerRolls.length * defenderRolls.length;

    for (const aRoll of attackerRolls) {
        const sortedA = [...aRoll].sort((a, b) => b - a);
        for (const dRoll of defenderRolls) {
            const sortedD = [...dRoll].sort((a, b) => b - a);
            let x = 0;
            for (let i = 0; i < n; i++) {
                if (sortedA[i] <= sortedD[i]) {
                    x++;
                }
            }
            lossesCounts[x]++;
        }
    }

    const probs = lossesCounts.map(count => count / total);
    transitionCache[key] = probs;
    return probs;
}

// Precompute for all possible combinations
for (let k = 1; k <= 3; k++) {
    for (let l = 1; l <= 2; l++) {
        computeTransition(k, l);
    }
}

const metricsCache = new Map();

function computeExactMetrics(attackerTroops, defenderTroops) {
    if (attackerTroops < 2 || defenderTroops < 1) return null;
    const cacheKey = `${attackerTroops},${defenderTroops}`;
    if (metricsCache.has(cacheKey)) return metricsCache.get(cacheKey);

    const A = attackerTroops;
    const D = defenderTroops;

    const dp = Array.from({ length: A + 1 }, () => new Array(D + 1));

    // Base cases
    for (let a = 0; a <= A; a++) {
        dp[a][0] = { win: 1, attackerLosses: 0, defenderLosses: 0, rounds: 0 };
    }
    for (let d = 1; d <= D; d++) {
        dp[0][d] = { win: 0, attackerLosses: 0, defenderLosses: 0, rounds: 0 };
        dp[1][d] = { win: 0, attackerLosses: 0, defenderLosses: 0, rounds: 0 };
    }

    for (let a = 2; a <= A; a++) {
        for (let d = 1; d <= D; d++) {
            const k = Math.min(3, a - 1);
            const l = Math.min(2, d);
            const n = Math.min(k, l);
            const trans = transitionCache[`${k},${l}`];

            let win = 0;
            let attackerLosses = 0;
            let defenderLosses = 0;
            let rounds = 0;

            for (let x = 0; x <= n; x++) {
                const p = trans[x];
                if (p === 0) continue;
                const y = n - x;
                const sub = dp[a - x][d - y];
                win += p * sub.win;
                attackerLosses += p * (x + sub.attackerLosses);
                defenderLosses += p * (y + sub.defenderLosses);
                rounds += p * (1 + sub.rounds);
            }

            dp[a][d] = { win, attackerLosses, defenderLosses, rounds };
        }
    }

    const res = dp[A][D];
    const metrics = {
        attackerWinProbability: res.win * 100,
        defenderWinProbability: (1 - res.win) * 100,
        expectedAttackerLosses: res.attackerLosses,
        expectedDefenderLosses: res.defenderLosses,
        expectedRounds: res.rounds,
    };
    metricsCache.set(cacheKey, metrics);
    return metrics;
}

// ============ Random Simulation Engine ============
class RiskCombatEngine {
    constructor(randomFn = Math.random) {
        this.randomFn = randomFn;
    }

    rollDie() {
        return Math.floor(this.randomFn() * 6) + 1;
    }

    rollDice(count) {
        const dice = [];
        for (let i = 0; i < count; i++) {
            dice.push(this.rollDie());
        }
        return dice.sort((a, b) => b - a);
    }

    resolveCombatRound(attackerTroops, defenderTroops) {
        if (attackerTroops < 2) throw new Error('مهاجم حداقل به ۲ سرباز برای حمله نیاز دارد');
        if (defenderTroops < 1) throw new Error('مدافع حداقل به ۱ سرباز برای دفاع نیاز دارد');

        const attackerDiceCount = Math.min(3, attackerTroops - 1);
        const defenderDiceCount = Math.min(2, defenderTroops);

        const attackerDice = this.rollDice(attackerDiceCount);
        const defenderDice = this.rollDice(defenderDiceCount);

        let attackerLosses = 0;
        let defenderLosses = 0;
        const comparisons = [];

        const comparisonCount = Math.min(attackerDice.length, defenderDice.length);
        for (let i = 0; i < comparisonCount; i++) {
            const attackDie = attackerDice[i];
            const defenseDie = defenderDice[i];
            if (attackDie > defenseDie) {
                defenderLosses++;
                comparisons.push({ attackerDie: attackDie, defenderDie: defenseDie, winner: 'attacker', loser: 'defender' });
            } else {
                attackerLosses++;
                comparisons.push({ attackerDie: attackDie, defenderDie: defenseDie, winner: 'defender', loser: 'attacker' });
            }
        }

        return {
            attackerDice,
            defenderDice,
            attackerLosses,
            defenderLosses,
            comparisons,
            newAttackerTroops: attackerTroops - attackerLosses,
            newDefenderTroops: defenderTroops - defenderLosses
        };
    }

    simulateBattle(attackerTroops, defenderTroops) {
        if (attackerTroops < 2) throw new Error('مهاجم حداقل به ۲ سرباز برای حمله نیاز دارد');
        if (defenderTroops < 1) throw new Error('مدافع حداقل به ۱ سرباز برای دفاع نیاز دارد');

        let currentAttacker = attackerTroops;
        let currentDefender = defenderTroops;
        const rounds = [];
        let totalAttackerLosses = 0;
        let totalDefenderLosses = 0;

        while (currentAttacker > 1 && currentDefender > 0) {
            const round = this.resolveCombatRound(currentAttacker, currentDefender);
            round.roundNumber = rounds.length + 1;
            round.attackerBefore = currentAttacker;
            round.defenderBefore = currentDefender;

            currentAttacker = round.newAttackerTroops;
            currentDefender = round.newDefenderTroops;

            totalAttackerLosses += round.attackerLosses;
            totalDefenderLosses += round.defenderLosses;

            rounds.push(round);
        }

        return {
            winner: currentDefender === 0 ? 'attacker' : 'defender',
            attackerRemaining: currentAttacker,
            defenderRemaining: currentDefender,
            attackerLosses: totalAttackerLosses,
            defenderLosses: totalDefenderLosses,
            totalRounds: rounds.length,
            rounds
        };
    }
}

const engine = new RiskCombatEngine();

// ============ UI State ============
let currentDisplayResult = null;
let stepBattleState = null;
let showDetails = false;

// ============ Live Probability Update ============
function updateLiveProbability() {
    const attackerInput = document.getElementById('attackerTroops');
    const defenderInput = document.getElementById('defenderTroops');
    const attackerTroops = parseInt(attackerInput.value);
    const defenderTroops = parseInt(defenderInput.value);

    const attackerValid = Number.isInteger(attackerTroops) && attackerTroops >= 2 && attackerTroops <= 1000;
    const defenderValid = Number.isInteger(defenderTroops) && defenderTroops >= 1 && defenderTroops <= 1000;

    const liveSection = document.getElementById('liveProbabilitySection');

    if (!attackerValid || !defenderValid) {
        liveSection.style.display = 'none';
        return;
    }

    const metrics = computeExactMetrics(attackerTroops, defenderTroops);
    if (!metrics) {
        liveSection.style.display = 'none';
        return;
    }

    liveSection.style.display = 'block';

    const attackerProb = metrics.attackerWinProbability;
    const defenderProb = metrics.defenderWinProbability;

    // به‌روزرسانی نوار احتمال
    const attackerBar = document.getElementById('liveAttackerProb');
    const defenderBar = document.getElementById('liveDefenderProb');
    
    if (attackerBar) {
        attackerBar.style.width = `${attackerProb}%`;
        attackerBar.textContent = `${attackerProb.toFixed(2)}%`;
    }
    
    if (defenderBar) {
        defenderBar.style.width = `${defenderProb}%`;
        defenderBar.textContent = `${defenderProb.toFixed(2)}%`;
    }

    // به‌روزرسانی آمار تلفات
    const attackerLossesEl = document.getElementById('liveAttackerLosses');
    if (attackerLossesEl) {
        attackerLossesEl.textContent = metrics.expectedAttackerLosses.toFixed(2);
    }

    // اضافه کردن المان‌های گم‌شده برای DefenderLosses و Rounds در صورت نیاز
    // یا حذف ارجاع به آنها اگر در HTML وجود ندارند
}

// ============ Input Event Listeners ============
document.getElementById('attackerTroops').addEventListener('input', function () {
    const value = parseInt(this.value);
    const valid = Number.isInteger(value) && value >= 2 && value <= 1000;
    if (valid) this.classList.remove('error');
    else this.classList.add('error');
    
    // بازنشانی وضعیت نبرد
    stepBattleState = null;
    currentDisplayResult = null;
    document.getElementById('resultSection').style.display = 'none';
    
    // به‌روزرسانی احتمال زنده
    try {
        updateLiveProbability();
    } catch (e) {
        console.warn('Error updating live probability:', e);
    }
});

document.getElementById('defenderTroops').addEventListener('input', function () {
    const value = parseInt(this.value);
    const valid = Number.isInteger(value) && value >= 1 && value <= 1000;
    if (valid) this.classList.remove('error');
    else this.classList.add('error');
    
    // بازنشانی وضعیت نبرد
    stepBattleState = null;
    currentDisplayResult = null;
    document.getElementById('resultSection').style.display = 'none';
    
    // به‌روزرسانی احتمال زنده
    try {
        updateLiveProbability();
    } catch (e) {
        console.warn('Error updating live probability:', e);
    }
});

// ============ Validation ============
function getInputs() {
    const attackerInput = document.getElementById('attackerTroops');
    const defenderInput = document.getElementById('defenderTroops');
    const attackerTroops = parseInt(attackerInput.value);
    const defenderTroops = parseInt(defenderInput.value);

    const attackerValid = Number.isInteger(attackerTroops) && attackerTroops >= 2 && attackerTroops <= 1000;
    const defenderValid = Number.isInteger(defenderTroops) && defenderTroops >= 1 && defenderTroops <= 1000;

    if (!attackerValid) attackerInput.classList.add('error');
    else attackerInput.classList.remove('error');
    if (!defenderValid) defenderInput.classList.add('error');
    else defenderInput.classList.remove('error');

    if (!attackerValid || !defenderValid) {
        // نمایش پیام خطا به کاربر
        const resultSection = document.getElementById('resultSection');
        const resultContent = document.getElementById('resultContent');
        resultSection.style.display = 'block';
        resultContent.innerHTML = `
            <div class="winner-banner in-progress">
                ⚠️ لطفاً مقادیر معتبر وارد کنید:
                <br>
                مهاجم: حداقل ۲، حداکثر ۱۰۰۰
                <br>
                مدافع: حداقل ۱، حداکثر ۱۰۰۰
            </div>
        `;
        return null;
    }
    
    return { attackerTroops, defenderTroops };
}
// ============ Display Functions ============
function displayResult(result, showAllRounds = false) {
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    resultSection.style.display = 'block';

    let winnerClass, winnerEmoji, winnerText;
    if (result.winner === 'attacker') {
        winnerClass = 'attacker';
        winnerEmoji = '⚔️';
        winnerText = 'مهاجم پیروز شد!';
    } else if (result.winner === 'defender') {
        winnerClass = 'defender';
        winnerEmoji = '🛡️';
        winnerText = 'مدافع پیروز شد!';
    } else {
        winnerClass = 'in-progress';
        winnerEmoji = '⚔️🛡️';
        winnerText = 'نبرد در جریان...';
    }

            //     <div class="stat-card">
            //     <div class="stat-label">تلفات مهاجم</div>
            //     <div class="stat-value">${result.attackerLosses}</div>
            // </div>
            // <div class="stat-card">
            //     <div class="stat-label">تلفات مدافع</div>
            //     <div class="stat-value">${result.defenderLosses}</div>
            // </div>

    let html = `
        <div class="winner-banner ${winnerClass}">
            ${winnerEmoji} ${winnerText}
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">سربازان باقیمانده مهاجم</div>
                <div class="stat-value">${result.attackerRemaining}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">سربازان باقیمانده مدافع</div>
                <div class="stat-value">${result.defenderRemaining}</div>
            </div>

        </div>
    `;

    if (result.currentMetrics && result.winner === null) {
        html += `
            <div class="live-probability" style="margin-top: 15px; border-color: var(--accent-yellow);">
                <h4>📊 احتمال پیروزی در حالت فعلی</h4>
                <div class="probability-bar">
                    <div class="probability-attacker" style="width: ${result.currentMetrics.attackerWinProbability}%;">
                        ${result.currentMetrics.attackerWinProbability.toFixed(2)}%
                    </div>
                    <div class="probability-defender" style="width: ${result.currentMetrics.defenderWinProbability}%;">
                        ${result.currentMetrics.defenderWinProbability.toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }

    if (showAllRounds && result.rounds && result.rounds.length > 0) {
        html += `
            <button class="toggle-details" onclick="toggleDetails()">پنهان کردن جزئیات</button>
            <div class="round-details">
                ${result.rounds.map(round => `
                    <div class="round-item">
                        <strong>دور ${round.roundNumber}</strong><br>
                        تاس‌های مهاجم: [${round.attackerDice.join('، ')}]<br>
                        تاس‌های مدافع: [${round.defenderDice.join('، ')}]<br>
                        ${round.comparisons.map((comp, i) => `
                            مقایسه ${i + 1}: ${comp.attackerDie} در برابر ${comp.defenderDie} → 
                            ${comp.winner === 'attacker' ? 'مدافع ۱ سرباز از دست می‌دهد' : 'مهاجم ۱ سرباز از دست می‌دهد'}<br>
                        `).join('')}
                        پس از دور: مهاجم: ${round.newAttackerTroops}، مدافع: ${round.newDefenderTroops}
                    </div>
                `).join('')}
            </div>
        `;
    } else if (result.rounds && result.rounds.length > 0) {
        html += `<button class="toggle-details" onclick="toggleDetails()">نمایش جزئیات</button>`;
    }

    resultContent.innerHTML = html;
}

function toggleDetails() {
    showDetails = !showDetails;
    if (currentDisplayResult) {
        displayResult(currentDisplayResult, showDetails);
    }
}

// ============ Button Actions ============
function simulateBattle() {
    const inputs = getInputs();
    if (!inputs) return;

    const result = engine.simulateBattle(inputs.attackerTroops, inputs.defenderTroops);
    result.metrics = computeExactMetrics(inputs.attackerTroops, inputs.defenderTroops);

    currentDisplayResult = result;
    stepBattleState = null;
    showDetails = false;
    displayResult(result, false);
}

function rollOneRound() {
    const inputs = getInputs();
    if (!inputs) return;

    if (!stepBattleState || stepBattleState.winner) {
        stepBattleState = {
            initialAttacker: inputs.attackerTroops,
            initialDefender: inputs.defenderTroops,
            currentAttacker: inputs.attackerTroops,
            currentDefender: inputs.defenderTroops,
            totalAttackerLosses: 0,
            totalDefenderLosses: 0,
            rounds: [],
            winner: null
        };
    }

    if (stepBattleState.winner) return;

    const currentAttacker = stepBattleState.currentAttacker;
    const currentDefender = stepBattleState.currentDefender;

    if (currentAttacker <= 1 || currentDefender <= 0) {
        stepBattleState.winner = currentDefender === 0 ? 'attacker' : 'defender';
        displayStepResult();
        return;
    }

    const round = engine.resolveCombatRound(currentAttacker, currentDefender);
    round.roundNumber = stepBattleState.rounds.length + 1;
    round.attackerBefore = currentAttacker;
    round.defenderBefore = currentDefender;

    stepBattleState.rounds.push(round);
    stepBattleState.currentAttacker = round.newAttackerTroops;
    stepBattleState.currentDefender = round.newDefenderTroops;
    stepBattleState.totalAttackerLosses += round.attackerLosses;
    stepBattleState.totalDefenderLosses += round.defenderLosses;

    if (round.newDefenderTroops === 0) {
        stepBattleState.winner = 'attacker';
    } else if (round.newAttackerTroops === 1) {
        stepBattleState.winner = 'defender';
    }

    displayStepResult();
}

function displayStepResult() {
    const result = {
        winner: stepBattleState.winner,
        attackerRemaining: stepBattleState.currentAttacker,
        defenderRemaining: stepBattleState.currentDefender,
        attackerLosses: stepBattleState.totalAttackerLosses,
        defenderLosses: stepBattleState.totalDefenderLosses,
        totalRounds: stepBattleState.rounds.length,
        rounds: stepBattleState.rounds,
        metrics: computeExactMetrics(stepBattleState.initialAttacker, stepBattleState.initialDefender)
    };

    if (stepBattleState.winner === null) {
        result.currentMetrics = computeExactMetrics(stepBattleState.currentAttacker, stepBattleState.currentDefender);
    }

    currentDisplayResult = result;
    displayResult(result, true);
}

function blitzMode() {
    const inputs = getInputs();
    if (!inputs) return;

    const flash = document.createElement('div');
    flash.className = 'blitz-animation';
    flash.textContent = '⚡';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);

    const result = engine.simulateBattle(inputs.attackerTroops, inputs.defenderTroops);
    result.metrics = computeExactMetrics(inputs.attackerTroops, inputs.defenderTroops);

    currentDisplayResult = result;
    stepBattleState = null;
    showDetails = false;
    displayResult(result, false);
}

function resetAll() {
    document.getElementById('attackerTroops').value = 10;
    document.getElementById('defenderTroops').value = 6;
    document.getElementById('attackerTroops').classList.remove('error');
    document.getElementById('defenderTroops').classList.remove('error');

    currentDisplayResult = null;
    stepBattleState = null;
    showDetails = false;

    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('resultContent').innerHTML = '';
    updateLiveProbability();
}

// ============ Initialize ============
window.addEventListener('DOMContentLoaded', () => {
    updateLiveProbability();
});