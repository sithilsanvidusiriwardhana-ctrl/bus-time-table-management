(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.otpUtils = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function generateOtp(length = 6) {
    const digits = '0123456789';
    let code = '';

    for (let index = 0; index < length; index += 1) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }

    return code;
  }

  function isValidOtp(input, expected) {
    return String(input || '').trim() === String(expected || '').trim();
  }

  return {
    generateOtp,
    isValidOtp
  };
});
