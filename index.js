let cufe = "";

pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function procesarPDF(){

const file = document.getElementById("pdfInput").files[0];

if(!file){
alert("Selecciona un PDF");
return;
}

const reader = new FileReader();

reader.onload = async function(){

const typedarray = new Uint8Array(this.result);

const pdf = await pdfjsLib.getDocument(typedarray).promise;

let text = "";

for(let i=1;i<=pdf.numPages;i++){

const page = await pdf.getPage(i);
const content = await page.getTextContent();

text += content.items.map(item => item.str).join(" ") + " ";

}

text = text.replace(/\s+/g," ");

extraerDatos(text);

};

reader.readAsArrayBuffer(file);

}


function extraerDatos(text){

/* =========================
   FACTURA
========================= */

const factura = text.match(/CV\s*\d+/)?.[0] || "";
const fecha = text.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
const cliente = text.match(/Cliente\s+(.*?)\s+Nit/i)?.[1] || "";
const nit = text.match(/Nit\s*\/\s*C\.C\.\s*([\d\.\-]+)/)?.[1] || "";

/* =========================
   CUFE
========================= */

let cufeMatch = text.match(/[a-f0-9]{64,}/i);
cufe = cufeMatch ? cufeMatch[0] : "";

/* =========================
   IVA (ROBUSTO)
========================= */

let iva19 = "";
let iva5 = "";
let iva0 = "";
let total = "";

const m19 = text.match(/IVA\s*19%\s*([\d.,]+)/i);
if(m19) iva19 = m19[1];

const m5 = text.match(/IVA\s*5%\s*([\d.,]+)/i);
if(m5) iva5 = m5[1];

const m0 = text.match(/IVA\s*0%\s*([\d.,]+)/i);
if(m0) iva0 = m0[1];

const mTotal = text.match(/Total\s*([\d.,]+)/i);
if(mTotal) total = mTotal[1];

/* =========================
   RESUMEN IMPUESTOS
========================= */

const base19 = text.match(/19\.00%\s*([\d.,]+)/)?.[1] || "";
const valor19 = text.match(/19\.00%\s*[\d.,]+\s*([\d.,]+)/)?.[1] || "";

const base5 = text.match(/5\.00%\s*([\d.,]+)/)?.[1] || "";
const valor5 = text.match(/5\.00%\s*[\d.,]+\s*([\d.,]+)/)?.[1] || "";

const base0 = text.match(/0\.00%\s*([\d.,]+)/)?.[1] || "";
const valor0 = text.match(/0\.00%\s*[\d.,]+\s*([\d.,]+)/)?.[1] || "";

/* =========================
   FORMA DE PAGO (EXACTO PDF)
========================= */

let pagoTexto = "";
let pagoValor = "";

const pagoMatch = text.match(/Forma de Pago([\s\S]*?)(A esta factura|RESUMEN IMPUESTOS|CUFE|$)/i);

if (pagoMatch) {
  let raw = pagoMatch[1].replace(/\s{2,}/g, " ").trim();

  pagoValor = raw.match(/([\d.,]+)\s*$/)?.[1] || "";
  pagoTexto = raw.replace(/([\d.,]+)\s*$/, "").trim();
}

/* =========================
   PRODUCTOS
========================= */

const regex = /([A-Za-z0-9\s\+\-]{4,40})\s+(\d+\.\d{2})\s+(\d+)\s?%\s+([\d.,]+)\s+([\d.,]+)/g;

let productos = "";
let match;

while((match = regex.exec(text)) !== null){

let nombre = match[1].trim();
let cant = match[2];
let imp = match[3];
let unit = match[4];
let totalProd = match[5];

if(nombre.toLowerCase().includes("iva")) continue;
if(nombre.toLowerCase().includes("resumen")) continue;
if(nombre.toLowerCase().includes("forma")) continue;
if(nombre.toLowerCase().startsWith("total")) continue;

productos += `
<div class="product-row">

<span class="col-desc">${nombre}</span>
<span class="col-cant">${cant}</span>
<span class="col-imp">${imp}%</span>
<span class="col-unit">${unit}</span>
<span class="col-total">${totalProd}</span>

</div>
`;

}

/* =========================
   IVA HTML (CONDICIONAL)
========================= */

let ivaHtml = "";

if(iva19){
ivaHtml += `
<div class="row">
<span>IVA 19%</span>
<span>${iva19}</span>
</div>
`;
}

if(iva5){
ivaHtml += `
<div class="row">
<span>IVA 5%</span>
<span>${iva5}</span>
</div>
`;
}

if(iva0){
ivaHtml += `
<div class="row">
<span>IVA 0%</span>
<span>${iva0}</span>
</div>
`;
}

/* =========================
   TICKET
========================= */

document.getElementById("ticket").innerHTML = `

<div class="header">

<div class="header-info">

<b>COMESTIBLES LA VILLA S.A.S</b><br>
Nit 900755203-3<br>
Cll 134 107 B 19<br>
Bogotá<br><br>

<b>Factura electrónica de venta</b><br>
${factura}

</div>

<div id="qrcode"></div>

</div>

<div class="divider"></div>

Fecha: ${fecha}<br><br>

Cliente: ${cliente}<br>
Nit / C.C.: ${nit}<br>

<div class="divider"></div>

<div class="product-header">
<span class="col-desc">Descripción</span>
<span class="col-cant">Cant</span>
<span class="col-imp">Imp</span>
<span class="col-unit">Vr.Unit</span>
<span class="col-total">Vr.Total</span>
</div>

<div class="divider"></div>

${productos}

<div class="divider"></div>

${ivaHtml}

<div class="row total">
<span>TOTAL</span>
<span>${total}</span>
</div>

<div class="divider"></div>

<div class="center"><b>RESUMEN IMPUESTOS</b></div>

<div class="row">
<span>Tarifa</span>
<span>Base</span>
<span>Valor</span>
</div>

${base19 || valor19 ? `
<div class="row">
<span>19.00%</span>
<span>${base19}</span>
<span>${valor19}</span>
</div>
` : ""}

${base5 || valor5 ? `
<div class="row">
<span>5.00%</span>
<span>${base5}</span>
<span>${valor5}</span>
</div>
` : ""}

${base0 || valor0 ? `
<div class="row">
<span>0.00%</span>
<span>${base0}</span>
<span>${valor0}</span>
</div>
` : ""}

<div class="divider"></div>

<div class="center"><b>FORMA DE PAGO</b></div>

<div class="forma">
  <span class="pago-texto">${pagoTexto}</span>
  <span class="pago-valor">${pagoValor}</span>
</div>

<div class="divider"></div>

<div class="legal">

A esta factura de venta aplican las normas relativas a la letra de cambio (art. 5 Ley 1231 de 2008).
El Comprador declara haber recibido real y materialmente las mercancías o prestación de servicios descritos en este título - Valor.
Número Autorización Electrónica 18764105740941 Aprobado en 20260209 Prefijo CV 20001 - 30000 Vigencia: 24 Meses.
Responsable de IVA Actividad Económica 4729 Comercio al por menor de alimentos Tarifa 4,14<br></br>

NIT: 9007552033<br>   
Favor consignar en las siguientes cuentas:<br> 
- Banco Caja Social<br> 
Cuenta Corriente N° 21004444661<br> 
- Bancolombia<br> 
Cuenta de Ahorros N° 54700001288<br> 
A nombre de COMESTIBLES LA VILLA S.A.S.<br> 
Atención, quejas y reclamos:<br> 
comestibleslabellavilla@hotmail.com<br> 

</div>

<div class="divider"></div>

<div class="center">

<b>CUFE</b><br>

${cufe ? cufe.match(/.{1,42}/g).join("<br>") : ""}

</div>

`;


/* QR */
if(cufe){

document.getElementById("qrcode").innerHTML = "";

new QRCode(document.getElementById("qrcode"),{

text:"https://catalogo-vpfe.dian.gov.co/document/searchqr?documentKey="+cufe,
width:90,
height:90

});

}

}


/* PDF */
async function generarPDF(){

const element = document.getElementById("ticket");

await new Promise(r => setTimeout(r,800));

const alturaPx = element.scrollHeight;
const alturaMM = alturaPx * 0.264583;

html2pdf().set({

margin:0,
filename:"ticket_80mm.pdf",
image:{type:"jpeg",quality:1},
html2canvas:{scale:3},
jsPDF:{unit:"mm",format:[80,alturaMM]}

}).from(element).save();

}