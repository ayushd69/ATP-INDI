export const INR_RATE = 82.5;

export const toINR = (value) => {
  const amount = Number(value ?? 0);
  return Number((amount * INR_RATE).toFixed(2));
};

export const formatINR = (value, decimals = 2) => {
  const amount = Number(value ?? 0);
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};
