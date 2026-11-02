"use strict";
(() => {
  const grid=document.getElementById("catalogGrid"); if(!grid)return;
  const search=document.getElementById("catalogSearch"), category=document.getElementById("catalogCategory"), sort=document.getElementById("catalogSort"), count=document.getElementById("catalogCount");
  let products=[];
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const price=p=>{const vals=(p.sizes||[]).map(z=>Number(p.sizePrices?.[z]??p.price)).filter(Number.isFinite);return vals.length?Math.min(...vals):Number(p.price)||0;};
  const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
  function render(){let list=products.filter(p=>{const q=search.value.trim().toLowerCase();return(!q||[p.name,p.category,p.description,...(p.colors||[])].join(" ").toLowerCase().includes(q))&&(category.value==="all"||p.category===category.value);});
    if(sort.value==="price-asc")list.sort((a,b)=>price(a)-price(b)); if(sort.value==="price-desc")list.sort((a,b)=>price(b)-price(a)); if(sort.value==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
    count.textContent=`${list.length} ${list.length===1?"JACKET":"JACKETS"} IN THE EDIT`;
    grid.innerHTML=list.length?list.map((p,i)=>`<article class="page-product-card"><a class="page-product-image" href="../product/${encodeURIComponent(p.slug)}/"><img loading="lazy" src="${escape(p.image||"../assets/jacket-placeholder.svg")}" alt="${escape(p.name)}" onerror="this.onerror=null;this.src='../assets/jacket-placeholder.svg'"><span>${escape(p.badge||`0${(i%9)+1} / THE EDIT`)}</span></a><div class="page-product-info"><small>${escape(p.category||"OUTERWEAR")}</small><h3><a href="../product/${encodeURIComponent(p.slug)}/">${escape(p.name)}</a></h3><p>${escape(p.description||"A considered layer from the AmaanTrader collection.")}</p><div><strong>From ${money(price(p))}</strong><a href="../product/${encodeURIComponent(p.slug)}/">VIEW JACKET ↗</a></div></div></article>`).join(""):`<p class="catalog-empty">No jackets match this search. Try another category or clear your search.</p>`;
  }
  fetch("../api/products",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Catalogue request failed");return r.json();}).then(data=>{if(!Array.isArray(data))throw Error("Invalid catalogue");products=data;[...new Set(products.map(p=>p.category).filter(Boolean))].sort().forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;category.append(o);});const params=new URLSearchParams(location.search);const q=params.get("q");if(q)search.value=q; if(params.get("sort")==="new"){sort.value="featured";products.sort((a,b)=>Number(Boolean(b.newIn))-Number(Boolean(a.newIn)));}render();}).catch(()=>{count.textContent="COLLECTION UNAVAILABLE";grid.innerHTML='<p class="catalog-empty">The catalogue could not load. Start the website with <code>npm start</code> so the product API is available.</p>';});
  [search,category,sort].forEach(node=>node.addEventListener("input",render));
})();
