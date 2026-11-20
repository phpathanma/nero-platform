// Pase único "Free con Consumo". Cambia el monto o la hora aquí y se actualizan
// la página del evento, el ticket (pantalla y PDF), el correo y el escáner de puerta.
export const FREE_PASS_MIN_CONSUMPTION = 15;
export const FREE_PASS_DEADLINE = "10:30 p. m.";

export const FREE_PASS_BADGE = "Viernes · Acceso con QR";
export const FREE_PASS_TITLE = "Free con Consumo";
export const FREE_PASS_CONDITION = `Válido por un consumo mínimo de S/ ${FREE_PASS_MIN_CONSUMPTION} en puerta hasta las ${FREE_PASS_DEADLINE}`;
export const FREE_PASS_NAME = `${FREE_PASS_TITLE} (S/ ${FREE_PASS_MIN_CONSUMPTION} · Hasta ${FREE_PASS_DEADLINE})`;
export const FREE_PASS_CTA = "Generar mi QR";
