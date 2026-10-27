import Lenis from './assets/vendor/lenis.mjs';
import { initMotion } from './motion.js';
import { initSignScene } from './sign-scene.js';
import { projects, services } from './content.js';

const cleanups=[];
const motion=initMotion({gsap:window.gsap,ScrollTrigger:window.ScrollTrigger,Lenis});
if(typeof motion==='function')cleanups.push(motion);

const menu=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('#mobile-nav');
const setOverlay=open=>document.dispatchEvent(new CustomEvent('rm1:overlay',{detail:{open}}));
const toggleMenu=(open)=>{menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрити меню':'Відкрити меню');mobileNav.hidden=!open;document.body.style.overflow=open?'hidden':'';document.querySelector('main').inert=open;document.querySelector('footer').inert=open;setOverlay(open);if(open)mobileNav.querySelector('a').focus();};
menu?.addEventListener('click',()=>toggleMenu(menu.getAttribute('aria-expanded')!=='true'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){toggleMenu(false);menu.focus();}});
document.addEventListener('keydown',e=>{if(e.key!=='Tab'||menu?.getAttribute('aria-expanded')!=='true')return;const items=[menu,...mobileNav.querySelectorAll('a')];const current=items.indexOf(document.activeElement);if(e.shiftKey&&current===0){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&current===items.length-1){e.preventDefault();menu.focus();}});
mobileNav?.addEventListener('click',e=>{if(e.target.closest('a'))toggleMenu(false);});
window.matchMedia('(min-width:801px)').addEventListener('change',e=>{if(e.matches)toggleMenu(false);});

const filters=[...document.querySelectorAll('[data-filter]')];
const grid=document.querySelector('.portfolio-grid');
filters.forEach(button=>button.addEventListener('click',()=>{const filter=button.dataset.filter;filters.forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});let count=0;grid?.querySelectorAll('[data-project]').forEach(card=>{card.hidden=filter!=='all'&&card.dataset.category!==filter;if(!card.hidden)count++;});const status=document.querySelector('.filter-status');if(status)status.textContent=`Знайдено робіт: ${count}`;}));

const dialog=document.querySelector('.project-dialog');
let lastProjectButton=null;
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>{const project=projects.find(p=>p.id===button.dataset.project);if(!project||!dialog)return;lastProjectButton=button;dialog.querySelector('.dialog-image').src=`./assets/${project.image}`;dialog.querySelector('.dialog-image').alt=`${project.title} — робота майстерні РМ1`;dialog.querySelector('h2').textContent=project.title;dialog.querySelector('.dialog-meta').textContent=project.meta;dialog.querySelector('.dialog-caption>a').href=`./contacts.html?service=${project.category}#request`;dialog.showModal();document.body.style.overflow='hidden';}));
const closeDialog=()=>dialog?.close();
dialog?.querySelector('.dialog-close').addEventListener('click',closeDialog);
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
dialog?.addEventListener('close',()=>{document.body.style.overflow='';setOverlay(false);lastProjectButton?.focus({preventScroll:true});});
dialog?.addEventListener('toggle',()=>setOverlay(dialog.open));

const form=document.querySelector('#quote-form');
const serviceParam=new URLSearchParams(location.search).get('service');
if(form&&services.some(s=>s.id===serviceParam))form.elements.service.value=serviceParam;
let requestText='';
const validatePhone=()=>{if(!form)return;const phone=form.elements.phone;const digits=phone.value.replace(/\D/g,'');phone.setCustomValidity(digits.length>=10&&digits.length<=15?'':'Вкажіть телефон: від 10 до 15 цифр.');};
form?.elements.phone.addEventListener('input',validatePhone);
form?.querySelector('.form-submit').addEventListener('click',validatePhone);
form?.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form);const selected=services.find(s=>s.id===data.get('service'))?.title||'Потрібна консультація';requestText=`Вітаю! Хочу отримати розрахунок вартості.\n\nІм’я: ${data.get('name').trim()}\nТелефон: ${data.get('phone').trim()}\nНапрям: ${selected}\n\nЗадача:\n${data.get('message').trim()}\n\nЗаявка з сайту РМ1.`;const email=form.querySelector('#send-email');const address=email.getAttribute('href').replace('mailto:','').split('?')[0];email.href=`mailto:${address}?subject=${encodeURIComponent('Заявка на розрахунок / '+selected)}&body=${encodeURIComponent(requestText)}`;form.querySelector('.form-result').hidden=false;form.querySelector('.copy-status').textContent='';form.querySelector('.form-result').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'nearest'});});
form?.querySelector('.copy-request')?.addEventListener('click',async()=>{const status=form.querySelector('.copy-status');try{await navigator.clipboard.writeText(requestText);status.textContent='Текст скопійовано. Можна надіслати його у Viber або Telegram.';}catch{status.textContent='Копіювання недоступне. Натисніть «Відкрити пошту» або зателефонуйте нам.';}});
if(document.querySelector('#sign-scene'))initSignScene().then(cleanup=>{if(typeof cleanup==='function')cleanups.push(cleanup);}).catch(()=>{});
window.addEventListener('pagehide',e=>{if(!e.persisted)cleanups.forEach(fn=>fn());});
