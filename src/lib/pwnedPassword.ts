/**
 * Check if a password has been compromised using HaveIBeenPwned API
 * Uses k-Anonymity model - only sends first 5 characters of SHA-1 hash
 */

const sha1 = async (message: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
};

export const checkPwnedPassword = async (password: string): Promise<{ 
  isPwned: boolean; 
  count: number;
  error?: string;
}> => {
  try {
    // Generate SHA-1 hash of password
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query HaveIBeenPwned API with k-Anonymity model
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        method: 'GET',
        headers: {
          'Add-Padding': 'true', // Extra security - pads response to fixed size
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to check password:', response.status);
      return { isPwned: false, count: 0, error: 'Não foi possível verificar a senha' };
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Check if our suffix appears in the results
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        const count = parseInt(countStr.trim(), 10);
        return { isPwned: true, count };
      }
    }

    return { isPwned: false, count: 0 };
  } catch (error) {
    console.error('Error checking pwned password:', error);
    // Fail open - don't block user if API is unavailable
    return { isPwned: false, count: 0, error: 'Erro ao verificar senha' };
  }
};

export const formatPwnedCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)} milhões`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)} mil`;
  }
  return count.toString();
};
