function crc16(str) {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generateVietQR(bankBin, accNumber, amount, addInfo) {
    const pad = (n) => n.toString().padStart(2, '0');
    const tlv = (id, val) => `${id}${pad(val.length)}${val}`;
    
    const consumerInfo = tlv('00', 'A000000727') + tlv('01', tlv('00', bankBin) + tlv('01', accNumber));
    const dataObjects = [
        tlv('00', '01'),
        tlv('01', '12'),
        tlv('38', consumerInfo),
        tlv('53', '704'),
    ];
    if (amount) dataObjects.push(tlv('54', amount.toString()));
    dataObjects.push(tlv('58', 'VN'));
    if (addInfo) dataObjects.push(tlv('62', tlv('08', addInfo)));
    
    let payload = dataObjects.join('') + '6304';
    payload += crc16(payload);
    return payload;
}

console.log(generateVietQR('970422', '6119916886', '3000000', 'NGUYEN MINH ANH'));
