import { z } from 'zod';

/**
 * Strong password validation schema
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter pelo menos um caractere especial (!@#$%^&* etc)');

/**
 * Password strength calculator
 * Returns: 'weak' | 'medium' | 'strong' | 'very-strong'
 */
export const getPasswordStrength = (password: string): string => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  if (password.length >= 16) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  if (strength <= 5) return 'strong';
  return 'very-strong';
};

/**
 * Get color class for password strength indicator
 */
export const getStrengthColor = (strength: string): string => {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-blue-500';
    case 'very-strong':
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
};

/**
 * Password requirements for UI display
 */
export const passwordRequirements = [
  { id: 1, text: 'Mínimo de 8 caracteres', regex: /.{8,}/ },
  { id: 2, text: 'Uma letra maiúscula', regex: /[A-Z]/ },
  { id: 3, text: 'Uma letra minúscula', regex: /[a-z]/ },
  { id: 4, text: 'Um número', regex: /[0-9]/ },
  { id: 5, text: 'Um caractere especial (!@#$%^&* etc)', regex: /[^A-Za-z0-9]/ },
];

/**
 * Validate password and return detailed error or null
 */
export const validatePassword = (password: string): string | null => {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return result.error.errors[0].message;
  }
  return null;
};
