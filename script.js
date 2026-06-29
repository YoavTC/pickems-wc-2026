const CODES = {
	'germany':'de','paraguay':'py','france':'fr','sweden':'se',
	'south africa':'za','canada':'ca','netherlands':'nl','morocco':'ma',
	'portugal':'pt','croatia':'hr','spain':'es','austria':'at',
	'united states':'us','bosnia and herzegovina':'ba','belgium':'be','senegal':'sn',
	'brazil':'br','japan':'jp','ivory coast':'ci','norway':'no',
	'mexico':'mx','ecuador':'ec','england':'en','dr congo':'cd',
	'argentina':'ar','cape verde':'cv','australia':'au','egypt':'eg',
	'switzerland':'ch','algeria':'dz','colombia':'co','ghana':'gh'
};

const R32 = [
	['germany','paraguay'],['france','sweden'],
	['south africa','canada'],['netherlands','morocco'],
	['portugal','croatia'],['spain','austria'],
	['united states','bosnia and herzegovina'],['belgium','senegal'],
	['brazil','japan'],['ivory coast','norway'],
	['mexico','ecuador'],['england','dr congo'],
	['argentina','cape verde'],['australia','egypt'],
	['switzerland','algeria'],['colombia','ghana']
];

let matches = {};
const r32Ids = [];
R32.forEach((p,i)=>{
	const id = 'r32_'+i;
	matches[id] = {team1:p[0], team2:p[1], winner:null, loser:null, locked:false};
	r32Ids.push(id);
});

function buildRound(prevIds, name){
	const ids = [];
	for(let i=0;i<prevIds.length;i+=2){
	const id = name+'_'+(i/2);
	matches[id] = {team1:null, team2:null, winner:null, loser:null, locked:false};
	matches[prevIds[i]].feedsTo = {matchId:id, slot:'team1'};
	matches[prevIds[i+1]].feedsTo = {matchId:id, slot:'team2'};
	ids.push(id);
	}
	return ids;
}

const r16Ids = buildRound(r32Ids,'r16');
const qfIds = buildRound(r16Ids,'qf');
const sfIds = buildRound(qfIds,'sf');
const finalIds = buildRound(sfIds,'final');

const leftR32 = r32Ids.slice(0,8), rightR32 = r32Ids.slice(8,16);
const leftR16 = r16Ids.slice(0,4), rightR16 = r16Ids.slice(4,8);
const leftQF = qfIds.slice(0,2), rightQF = qfIds.slice(2,4);
const leftSF = [sfIds[0]], rightSF = [sfIds[1]];

function propagate(id){
	const m = matches[id];
	if(!m.winner || !m.feedsTo) return;
	matches[m.feedsTo.matchId][m.feedsTo.slot] = m.winner;
}
propagate('r32_2');

function clearDownstream(id){
	const m = matches[id];
	if(!m.feedsTo) return;
	const t = matches[m.feedsTo.matchId];
	t[m.feedsTo.slot] = null;
	if(t.winner){ t.winner=null; t.loser=null; clearDownstream(m.feedsTo.matchId); }
}

function pick(id, team){
	const m = matches[id];
	if(!m || m.locked || !m.team1 || !m.team2) return;
	if(m.winner === team) return;
	if(m.winner) clearDownstream(id);
	m.winner = team;
	m.loser = team === m.team1 ? m.team2 : m.team1;
	propagate(id);
	render();
}

function resetAll(){
	Object.keys(matches).forEach(id=>{
	const m = matches[id];
	if(m.locked) return;
	m.winner = null; m.loser = null;
	});
	[...r16Ids, ...qfIds, ...sfIds, ...finalIds].forEach(id=>{
	matches[id].team1 = null; matches[id].team2 = null;
	});
	propagate('r32_2');
	render();
}

async function shareScreenshot(){
	const header = document.querySelector('header');
	header.style.visibility = 'hidden';
	try{
		const canvas = await html2canvas(document.querySelector('.wrap'), {
			backgroundColor: getComputedStyle(document.body).backgroundColor
		});
		const blob = await new Promise(resolve => canvas.toBlob(resolve));
		await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
	}catch(err){
		console.error('Screenshot failed', err);
	}finally{
		header.style.visibility = 'visible';
	}
}

document.getElementById('screenshotBtn').addEventListener('click', shareScreenshot);
function teamRowHTML(id, m, slot){
	const team = m[slot];
	if(!team) return `<div class="team tbd"><img class="flag-img" src="assets/tbd.png"></img></div>`;
	const code = CODES[team];
	const isWinner = m.winner === team;
	const isLoser = m.winner && m.winner !== team;
	const cls = isWinner ? 'winner' : (isLoser ? 'loser' : '');
	const clickable = !m.locked && m.team1 && m.team2;
	return `<div class="team ${cls} ${clickable ? 'clickable' : ''}" title="${team}" ${clickable ? `data-match="${id}" data-team="${team}"` : ''}>
	<img class="flag-img" src="assets/flags/${code}.png" alt="${code}" onerror="this.style.opacity=0">${isWinner ? '<span class="chev">›</span>' : ''}
	</div>`;
}

function matchCardHTML(id){
	const m = matches[id];
	return `<div class="match">
	${teamRowHTML(id, m, 'team1')}
	${teamRowHTML(id, m, 'team2')}
	</div>`;
}

function renderRound(ids, containerId){
	document.getElementById(containerId).innerHTML = ids.map(matchCardHTML).join('');
}

function render(){
	renderRound(leftR32, 'r32-left');
	renderRound(leftR16, 'r16-left');
	renderRound(leftQF, 'qf-left');
	renderRound(leftSF, 'sf-left');
	renderRound(finalIds, 'final-matches');
	renderRound(rightSF, 'sf-right');
	renderRound(rightQF, 'qf-right');
	renderRound(rightR16, 'r16-right');
	renderRound(rightR32, 'r32-right');

	const finalMatch = matches[finalIds[0]];
	const flagEl = document.getElementById('championFlag');
	if(finalMatch && finalMatch.winner){
		flagEl.src = `assets/flags/${CODES[finalMatch.winner]}.png`;
		flagEl.style.display = 'block';
	} else {
		flagEl.style.display = 'none';
	}
}

document.body.addEventListener('click', e=>{
	const el = e.target.closest('[data-match]');
	if(!el) return;
	pick(el.dataset.match, el.dataset.team);
});

document.getElementById('resetBtn').addEventListener('click', resetAll);
document.getElementById('screenshotBtn').addEventListener('click', shareScreenshot);

render();