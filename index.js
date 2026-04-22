let cufe = "";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function procesarPDF() {
    const file = document.getElementById("pdfInput").files[0];
    if (!file) {
        alert("Selecciona un PDF");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ") + " ";
        }

        // Limpieza de espacios y saltos de línea para que todo sea una sola cadena
        text = text.replace(/\s+/g, " ");
        extraerDatos(text);
    };
    reader.readAsArrayBuffer(file);
}

function extraerDatos(text) {
    /* =========================
       DATOS DE CABECERA (REGEX OPTIMIZADAS)
    ========================= */

    const factura = text.match(/CV\s*\d+/)?.[0] || "";
    const fecha = text.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    const vendedor = text.match(/Vendedor:?\s*(.*?)\s+Cliente/i)?.[1]?.trim() || "";
    const cliente = text.match(/Cliente:?\s*(.*?)\s+Nit/i)?.[1]?.trim() || "";
    
    // Captura el NIT para usarlo como punto de referencia
    const nitMatch = text.match(/Nit\s*\/\s*C\.C\.?\s*:?\s*([\d\.\-]+)/i);
    const nit = nitMatch ? nitMatch[1].trim() : "";

    /* =========================
       EXTRACCIÓN DE DIRECCIÓN DINÁMICA
    ========================= */
/* =========================
   EXTRACCIÓN DE DIRECCIÓN (LIMPIEZA DE DUPLICADOS)
========================= */
let direccionCliente = "";
if (nit) {
    const nitEscapado = nit.replace(/\./g, "\\.");
    const regexDir = new RegExp(nitEscapado + "\\s+(.*?)\\s+(Descripción|Ciudad|Bogotá|Teléfono|Email)", "i");
    const matchDir = text.match(regexDir);
    
    if (matchDir) {
        // 1. Atrapamos el texto que sigue al NIT
        let tempDir = matchDir[1].trim();
        
        // 2. LIMPIEZA: Si el texto empieza con "Dirección", lo borramos para que no se repita
        // Esto quita "Dirección", "Direccion", "DIRECCION", etc.
        direccionCliente = tempDir.replace(/^direcci[oó]n:?\s*/i, "");
    }
}
    let cufeMatch = text.match(/[a-f0-9]{64,}/i);
    cufe = cufeMatch ? cufeMatch[0] : "";

    /* =========================
       IMPUESTOS Y TOTALES
    ========================= */
    let iva19 = text.match(/IVA\s*19%\s*([\d.,]+)/i)?.[1] || "";
    let iva5 = text.match(/IVA\s*5%\s*([\d.,]+)/i)?.[1] || "";
    let iva0 = text.match(/IVA\s*0%\s*([\d.,]+)/i)?.[1] || "";
    let total = text.match(/Total\s*([\d.,]+)/i)?.[1] || "";

    const base19 = text.match(/19\.00%\s*([\d.,]+)/)?.[1] || "";
    const valor19 = text.match(/19\.00%\s*[\d.,]+\s*([\d.,]+)/)?.[1] || "";
    const base0 = text.match(/0\.00%\s*([\d.,]+)/)?.[1] || "";
    const valor0 = text.match(/0\.00%\s*[\d.,]+\s*([\d.,]+)/)?.[1] || "";
    const base5 = text.match(/5\.00%\s*([\d.,]+)/)?.[1] || "";
    const valor5 = text.match(/5\.00%\s*[\d.,]+\s*([\d.,]+)/)?.[1] || "";

    /* =========================
       PRODUCTOS
    ========================= */
    let productos = "";
    const productRegex = /([A-Z0-9\s\+\-\*]{3,45})\s+(\d+\.\d{2})\s+(\d+)\s?%\s+([\d.,]+)\s+([\d.,]+)/g;

    let match;
    while ((match = productRegex.exec(text)) !== null) {
        let nombre = match[1].trim();
        let cant = match[2];
        let imp = match[3];
        let unit = match[4]; 
        let totalProd = match[5];

        nombre = nombre.replace(/.*Descripción\s+/i, "").trim();
        const n = nombre.toLowerCase();
        // Evitamos capturar líneas de etiquetas como si fueran productos
        if (n.includes("iva") || n.includes("resumen") || n.includes("vendedor") || n.includes("cliente")) continue;

        productos += `
        <div class="product-row">
            <span class="col-desc">${nombre}</span>
            <span class="col-cant">${cant}</span>
            <span class="col-imp">${imp}%</span>
            <span class="col-unit">${unit}</span>
            <span class="col-total">${totalProd}</span>
        </div>`;
    }

    /* =========================
       FORMA DE PAGO
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
       CONSTRUCCIÓN HTML DEL TICKET
    ========================= */
    let ivaHtml = "";
    if (iva19) ivaHtml += `<div class="row"><span>IVA 19%</span><span>${iva19}</span></div>`;
    if (iva5) ivaHtml += `<div class="row"><span>IVA 5%</span><span>${iva5}</span></div>`;
    if (iva0) ivaHtml += `<div class="row"><span>IVA 0%</span><span>${iva0}</span></div>`;

    document.getElementById("ticket").innerHTML = `
        <div class="header">
            <div class="header-info">
                <b>COMESTIBLES LA VILLA S.A.S</b><br>
                Nit 900.755.203-3<br>
                Cll 134 107 B 19<br>
                Bogotá-Tel (601) 3103006527<br>
                comestibleslabellavilla@hotmail.com<br><br>
                <b>Factura electrónica de venta</b><br>
                ${factura}
            </div>
            <div id="qrcode"></div>
        </div>

        <div class="divider"></div>
        <b>Fecha:</b> ${fecha}<br>
        <b>Vendedor:</b> ${vendedor}<br>
        <b>Cliente:</b> ${cliente}<br>
        <b>Nit / C.C.:</b> ${nit}<br>
        <b>Direccion:</b> ${direccionCliente}<br>
        
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
        <div class="row"><span>Tarifa</span><span>Base</span><span>Valor</span></div>
        ${base19 || valor19 ? `<div class="row"><span>19.00%</span><span>${base19}</span><span>${valor19}</span></div>` : ""}
        ${base0 || valor0 ? `<div class="row"><span>0.00%</span><span>${base0}</span><span>${valor0}</span></div>` : ""}
        ${base5 || valor5 ? `<div class="row"><span>5.00%</span><span>${base5}</span><span>${valor5}</span></div>` : ""}
        <div class="divider"></div>
        <div class="center"><b>FORMA DE PAGO</b></div>
        <div class="forma">
            <span class="pago-texto">${pagoTexto}</span>
            <span class="pago-valor">${pagoValor}</span>
        </div>

        <div class="divider"></div>
        <div class="legal">
            A esta factura de venta aplican las normas relativas a la letra de cambio (art. 5 Ley 1231 de 2008). 
            Número Autorización Electrónica 18764105740941 Aprobado en 20260209 Prefijo CV 20001 - 30000 Vigencia: 24 Meses.
            Responsable de IVA Actividad Económica 4729 Comercio al por menor de alimentos Tarifa 4,14<br><br>
            <b>NIT: 9007552033</b><br>
            Favor consignar en las siguientes cuentas:<br>
            - Banco Caja Social Corriente N° 21004444661<br>
            - Bancolombia Ahorros N° 54700001288<br>
            A nombre de COMESTIBLES LA VILLA S.A.S.
        </div>

        <div class="divider"></div>
        <div class="center">
            <b>CUFE</b><br>
            ${cufe ? cufe.match(/.{1,49}/g).join("<br>") : ""}
        </div>
    `;

    if (cufe) {
        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentKey=" + cufe,
            width: 90,
            height: 90
        });
    }
}

async function generarPDF() {
    const element = document.getElementById("ticket");
    await new Promise(r => setTimeout(r, 800));
    const alturaPx = element.scrollHeight;
    const alturaMM = alturaPx * 0.264583;

    html2pdf().set({
        margin: 0,
        filename: "ticket_80mm.pdf",
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 3 },
        jsPDF: { unit: "mm", format: [80, alturaMM] }
    }).from(element).save();
}