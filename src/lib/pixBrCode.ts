// Gerador de BR Code (Pix Copia e Cola) estático - padrão EMV do Banco Central

const emv = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, '0')}${value}`;

const crc16 = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const sanitize = (v: string, max: number) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase();

export interface PixBrCodeParams {
  key: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
}

export function buildPixBrCode({
  key,
  merchantName,
  merchantCity,
  amount,
  txid,
}: PixBrCodeParams): string {
  const cleanKey = key.trim();
  const mai = emv('00', 'br.gov.bcb.pix') + emv('01', cleanKey);

  const reference = sanitize(txid || '***', 25) || '***';

  let payload =
    emv('00', '01') +
    emv('26', mai) +
    emv('52', '0000') +
    emv('53', '986') +
    (amount && amount > 0 ? emv('54', amount.toFixed(2)) : '') +
    emv('58', 'BR') +
    emv('59', sanitize(merchantName, 25) || 'LOJA') +
    emv('60', sanitize(merchantCity, 15) || 'SAO PAULO') +
    emv('62', emv('05', reference));

  payload += '6304';
  return payload + crc16(payload);
}
