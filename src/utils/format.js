const priceFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' });

export const formatPrice = (price) => (price == null ? '—' : priceFormat.format(price));

// shipmentDate: дата отгрузки + время, до которого нужно успеть заказать.
// Пустую дату 1С («0001-01-01») и нечитаемые значения просто не показываем.
export function formatShipment(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return '';

  const day = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  if (date.getHours() === 0 && date.getMinutes() === 0) return `Отгрузка: ${day}`;

  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `Отгрузка: ${day}, заказ до ${time}`;
}
