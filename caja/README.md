# Caja

Caja e inventario para el local (empanadas, pizzas y otros productos). Mobile-first, en español.

## Qué hace (v1)

- **Vender**: se toca el producto, se elige el medio de pago (efectivo, transferencia, débito, crédito) y se cobra. Cada venta descuenta del **mostrador**.
- **Turno y cierre**: se abre con un fondo inicial. Muestra efectivo, transferencia, débito, crédito, **total digital**, **total vendido** y **unidades vendidas**. Al cerrar se carga el efectivo contado (arqueo contra `fondo + ventas en efectivo`) y lo que sobró por producto.
- **Stock**: dos ubicaciones, depósito y mostrador. Ingreso de mercadería y traspaso depósito → mostrador. El conteo de cierre guarda la diferencia contra el stock teórico y deja el stock alineado a lo contado.
- **Productos**: alta, precio, categoría y activo/inactivo.

Los montos son pesos enteros. El precio de cada venta lo toma el servidor, no el cliente.

## Desarrollo

```bash
cd caja
npm install
npm run dev      # sin DATABASE_URL usa una base en memoria (se borra al reiniciar). PIN de desarrollo: 1234
npm test         # reglas de caja y turno completo contra Postgres embebido (PGlite)
```

## Producción en Vercel

1. Importar este repo en Vercel con **Root Directory = `caja`**.
2. Agregar una base Postgres (Neon desde el Marketplace de Vercel) y definir las variables de `.env.example`:
   `DATABASE_URL`, `CAJA_PIN` y `CAJA_SECRET`. Sin `CAJA_PIN` y `CAJA_SECRET` la app no deja entrar en producción.
3. Las tablas se crean solas en el primer uso (`src/lib/schema.ts`).

## Pendiente / decisiones abiertas

- Un solo PIN compartido: no distingue quién vendió. Si hace falta, pasar a usuarios.
- No funciona sin internet.
- Sin recetas: el stock se cuenta por producto terminado (empanada, pizza), no por insumo.
- Pizza por porción o entera, y combos, todavía no están modelados.
