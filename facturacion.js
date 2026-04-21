let productosSeleccionados = [];
let productoSeleccionado = null;
let modoPrecio = 1; // 1 = precio1, 2 = precio2

document.getElementById("togglePrecios").addEventListener("click", function() {
    modoPrecio = modoPrecio === 1 ? 2 : 1;
    document.querySelectorAll(".producto").forEach(el => {
        el.textContent = `${el.dataset.nombre} - ${modoPrecio === 1 ? el.dataset.precio1 : el.dataset.precio2}`;
    });
});

document.querySelectorAll('.producto').forEach(item => {
    item.addEventListener('click', event => {
        const nombre = event.target.getAttribute('data-nombre');
        const precio = parseFloat(event.target.getAttribute(`data-precio${modoPrecio}`));

        productoSeleccionado = { nombre, precio };
        document.querySelectorAll('.producto').forEach(p => p.style.border = '1px solid #ddd');
        event.target.style.border = '2px solid blue';

        const cantidad = parseInt(prompt(`¿Cuántas unidades de ${productoSeleccionado.nombre} deseas agregar?`, "1"));
        if (!isNaN(cantidad) && cantidad > 0) {
            agregarProducto(cantidad);
        } else {
            alert('Cantidad no válida.');
        }
    });
});
function agregarProducto(cantidad) {
  if (!productoSeleccionado) {
      alert('Por favor, selecciona un producto.');
      return;
  }
  
  productosSeleccionados.push({ ...productoSeleccionado, cantidad });
  mostrarTicket();
}

// Parte 3
function mostrarTicket() {
  const ticketBody = document.getElementById('ticketBody');
  ticketBody.innerHTML = '';
  let totalFactura = 0;

  productosSeleccionados.forEach((producto, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${producto.nombre}</td>
          <td><input type="number" value="${producto.cantidad}" onchange="modificarCantidad(${index}, this.value)" style="width: 40px; text-align: center;"></td>
          <td>$${formatPrice(producto.precio)}</td>
          <td>$${formatPrice(producto.cantidad * producto.precio)}</td>
          <td><button onclick="eliminarProducto(${index})">Eliminar</button></td>
      `;
      ticketBody.appendChild(row);
      totalFactura += producto.cantidad * producto.precio;
  });

  document.getElementById('totalFactura').textContent = ` ${formatPrice(totalFactura)}`;
}

// Parte 4
function modificarCantidad(index, nuevaCantidad) {
  if (!isNaN(nuevaCantidad) && nuevaCantidad > 0) {
      productosSeleccionados[index].cantidad = parseInt(nuevaCantidad, 10);
      mostrarTicket();
  } else {
      alert('Cantidad no válida.');
  }
}

function eliminarProducto(index) {
  productosSeleccionados.splice(index, 1);
  mostrarTicket();
}

function formatPrice(price) {
  return price.toLocaleString('es-CO');
}

function generarTicketPDF() {
  const clienteInput = document.getElementById('cliente').value;
  const fecha = new Date().toLocaleDateString();
  const hora = new Date().toLocaleTimeString();
  const { jsPDF } = window.jspdf;
  const ticketHeight = 100 + (productosSeleccionados.length * 10);
  const doc = new jsPDF('p', 'mm', [85, ticketHeight]);

  let y = 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Ticket`, 42.5, y, { align: 'center' });
  y += 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Cliente: ${clienteInput}`, 1, y);
  y += 5;
  doc.text(`Fecha: ${fecha} ${hora}`, 1, y);
  y += 5;
  doc.text('Producto', 8, y);
  doc.text('Cantidad', 38, y);
  doc.text('Precio', 56, y);
  doc.text('Valor', 73, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  // Add your code to list products here


  let totalFactura = 0;
  productosSeleccionados.forEach(producto => {
      const nombreProducto = doc.splitTextToSize(producto.nombre, 47);
      doc.text(nombreProducto, 1, y + 5);
      doc.text(`${producto.cantidad}`, 45, y + 5);
      doc.text(`$${formatPrice(producto.precio)}`, 56, y + 5);
      doc.text(`$${formatPrice(producto.cantidad * producto.precio)}`, 72, y + 5);

      for (let i = 10; i < 80; i += 5) {
          doc.line(i, y + 8, i + 2, y + 8);
      }

      totalFactura += producto.cantidad * producto.precio;
      y += 7;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Total a Pagar: $${formatPrice(totalFactura)}`, 24, y + 8);
  doc.save(`ticket_factura_${fecha}.pdf`);

  resetFormulario();
}

document.getElementById("cargarFactura").onclick = function () {
    window.location.href = "siigo.html";
};