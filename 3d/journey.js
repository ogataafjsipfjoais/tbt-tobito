/**
 * Tobito Flight Log / travelling companion and commemorative boarding pass.
 * No trackers, server-side storage, or framework dependency.
 */
(() => {
  'use strict';

  const buddy = document.getElementById('journey-buddy');
  const buddyMessage = document.getElementById('buddy-message');
  const buddyChapter = document.getElementById('buddy-chapter');
  const buddyButton = document.getElementById('buddy-hello');
  const buddyLive = document.getElementById('buddy-live');
  const railLinks = [...document.querySelectorAll('[data-rail-step]')];
  const chapters = [
    {
      id: 'start',
      anchor: 'prologue-section',
      name: 'START / ひみつ基地',
      lines: ['やあ、待ってたよ。一緒に行こう！', '出発前に、ぼくのことを知ってくれる？']
    },
    {
      id: 'practice',
      anchor: 'poses',
      name: 'WAYPOINT 01 / 特訓',
      lines: ['こんな練習もしたよね。次はもっと高く跳べるかな？', '寄り道して、風をつかむ特訓もしよう！']
    },
    {
      id: 'hangar',
      anchor: 'hangar',
      name: 'WAYPOINT 02 / 格納庫',
      lines: ['見て、ぼくたちの翼だよ！', '40メートル！近くで見ると、やっぱり大きいね。']
    },
    {
      id: 'takeoff',
      anchor: 'takeoff',
      name: 'GOAL / テイクオフ',
      lines: ['風が吹いてきた。さあ、飛ぼう！', 'ここからが、本当のフライトだよ！']
    }
  ];
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let index = 0;
  let line = 0;
  let lastScroll = window.scrollY;
  let walkingTimer = 0;
  let raf = 0;
  let goalCelebrated = false;
  const play = document.getElementById('play');

  function updateChapter(next) {
    if (next === index) return;
    index = next;
    line = 0;
    if (buddy) {
      buddy.dataset.stage = chapters[index].id;
      buddy.classList.toggle('is-quiet', chapters[index].id === 'hangar');
    }
    if (buddyChapter) buddyChapter.textContent = chapters[index].name;
    if (buddyMessage) buddyMessage.textContent = chapters[index].lines[0];
    railLinks.forEach(link => {
      const position = chapters.findIndex(chapter => chapter.id === link.dataset.railStep);
      if (position === index) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
      link.classList.toggle('is-complete', position < index);
    });
    if (index === chapters.length - 1 && !goalCelebrated) {
      goalCelebrated = true;
      if (!reduced && buddy) {
        buddy.classList.add('is-celebrating');
        window.setTimeout(() => buddy.classList.remove('is-celebrating'), 1600);
      }
    }
  }

  function updateJourney() {
    raf = 0;
    const trigger = window.innerHeight * 0.47;
    let nextIndex = 0;
    chapters.forEach((chapter, chapterIndex) => {
      const section = document.getElementById(chapter.anchor);
      if (section && section.getBoundingClientRect().top <= trigger) nextIndex = chapterIndex;
    });
    updateChapter(nextIndex);
    if (play && buddy) {
      const rect = play.getBoundingClientRect();
      buddy.classList.toggle('is-playing', rect.top <= window.innerHeight * 0.7 && rect.bottom >= window.innerHeight * 0.3);
    }
  }

  function onScroll() {
    const change = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    if (change > 2 && !reduced && buddy) {
      buddy.classList.add('is-walking');
      window.clearTimeout(walkingTimer);
      walkingTimer = window.setTimeout(() => buddy.classList.remove('is-walking'), 190);
    }
    if (!raf) raf = window.requestAnimationFrame(updateJourney);
  }

  buddyButton?.addEventListener('click', () => {
    line = (line + 1) % chapters[index].lines.length;
    const phrase = chapters[index].lines[line];
    if (buddyMessage) buddyMessage.textContent = phrase;
    if (buddyLive) buddyLive.textContent = 'とびとくん：「' + phrase + '」';
    if (index === 0) window.Tobito3D?.flap?.();
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('pageshow', updateJourney);
  updateJourney();

  // Boarding pass: generated only in the visitor's browser.
  const form = document.getElementById('boarding-form');
  const input = document.getElementById('crew-name');
  const ticket = document.getElementById('boarding-ticket');
  const actions = document.getElementById('boarding-actions');
  const ticketName = document.getElementById('ticket-name');
  const ticketDate = document.getElementById('ticket-date');
  const status = document.getElementById('boarding-status');
  const download = document.getElementById('ticket-download');
  const boardingZone = document.getElementById('boarding-zone');
  let generated = false;
  let nameValue = 'TRAVELER';
  const dateValue = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  function safeName(value) {
    const clean = String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
    return clean.slice(0, 20) || 'TRAVELER';
  }

  function generatePass() {
    if (!ticket || !ticketName || !ticketDate) return;
    nameValue = safeName(input?.value);
    ticketName.textContent = nameValue;
    ticketDate.textContent = dateValue;
    ticket.hidden = false;
    if (actions) actions.hidden = false;
    generated = true;
    if (status) status.textContent = nameValue + 'の搭乗証を発行したよ！';
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    generatePass();
    ticket?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  });

  // At the end of the shared journey a default keepsake appears automatically.
  if ('IntersectionObserver' in window && boardingZone) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || generated) continue;
        generatePass();
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(boardingZone);
  } else if (boardingZone) {
    // The manual form remains usable when IntersectionObserver isn't available.
    if (status) status.textContent = '名前を入力して搭乗証を発行できます。';
  }

  // PNG download is produced entirely in memory. Input never leaves the browser.
  function drawTicket(ctx, width, height) {
    ctx.fillStyle = '#f1f4ee';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#fefdf7';
    ctx.fillRect(70, 60, width - 140, height - 120);
    ctx.strokeStyle = '#1b547f';
    ctx.lineWidth = 8;
    ctx.strokeRect(70, 60, width - 140, height - 120);

    const divider = 1050;
    ctx.fillStyle = '#c7e3ee';
    ctx.fillRect(divider, 64, width - divider - 74, height - 128);
    ctx.save();
    ctx.setLineDash([14, 11]);
    ctx.strokeStyle = '#3980a2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(divider, 72);
    ctx.lineTo(divider, height - 73);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#225781';
    ctx.font = '700 24px "DM Sans",sans-serif';
    ctx.fillText('TEAM BIRDMAN TRIAL  /  TOBITO', 125, 128);
    ctx.textAlign = 'right';
    ctx.fillText('FLIGHT LOG 001', divider - 48, 128);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#142f49';
    ctx.font = '900 108px "DM Sans",sans-serif';
    ctx.fillText('BOARDING PASS', 120, 265);
    ctx.font = '700 25px "Noto Sans JP",sans-serif';
    ctx.fillText('ふたりの旅の記念搭乗証', 128, 312);

    ctx.strokeStyle = '#8da6b5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(126, 359);
    ctx.lineTo(divider - 48, 359);
    ctx.stroke();

    const fields = [
      {x:128,y:418,label:'CREW NAME',value:nameValue},
      {x:590,y:418,label:'FLIGHT',value:'TBT S-320'},
      {x:128,y:535,label:'DESTINATION',value:'THE SKY'},
      {x:590,y:535,label:'STATUS',value:'READY FOR TAKEOFF'}
    ];
    fields.forEach(field => {
      ctx.fillStyle = '#607e90';
      ctx.font = '700 20px "DM Sans",sans-serif';
      ctx.fillText(field.label,field.x,field.y);
      ctx.fillStyle = '#173d60';
      ctx.font = '800 35px "Noto Sans JP","DM Sans",sans-serif';
      ctx.fillText(field.value,field.x,field.y+46,390);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#20547a';
    ctx.font = '800 22px "DM Sans",sans-serif';
    ctx.fillText('TOBITO × YOU', 1190, 142);
    const mascot = document.querySelector('#boarding-ticket .ticket-stub img');
    if (mascot?.complete && mascot.naturalWidth > 0) {
      ctx.drawImage(mascot, 1102, 183, 175, 175);
    }
    ctx.font = '900 35px "DM Sans",sans-serif';
    ctx.fillText("LET'S FLY.", 1190, 447);
    ctx.font = '700 22px "Noto Sans JP",sans-serif';
    ctx.fillText(dateValue, 1190, 505);
    ctx.font = '700 16px "DM Sans",sans-serif';
    ctx.fillStyle = '#688496';
    ctx.fillText('COMMEMORATIVE ONLY', 1190, 607);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#5f7d8e';
    ctx.font = '700 18px "Noto Sans JP",sans-serif';
    ctx.fillText('※ 記念品です。実際の航空機の搭乗券ではありません。', 130, height - 88);
  }

  download?.addEventListener('click', () => {
    if (!generated) generatePass();
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1400;
      canvas.height = 740;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas unavailable');
      drawTicket(ctx, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) {
          if (status) status.textContent = '画像を保存できませんでした。';
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tobito-flight-log.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        if (status) status.textContent = '搭乗証を画像として保存しました。';
      }, 'image/png');
    } catch (error) {
      if (status) status.textContent = '画像保存を利用できません。画面の搭乗証をご利用ください。';
    }
  });
})();
