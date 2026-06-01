/** Генерирует уникальный цвет для каждого преподавателя.
 *  Использует хэш имени и golden-angle для равномерного разнесения по кругу HSL.
 */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Возвращает { bg, border, text } — мягкий фон, насыщенная рамка, тёмный текст */
export function teacherColor(name: string): { bg: string; border: string; text: string } {
  const GOLDEN_ANGLE = 137.508;
  const idx = hash(name);
  const hue = (idx * GOLDEN_ANGLE) % 360;
  return {
    bg: `hsl(${hue} 70% 92%)`,
    border: `hsl(${hue} 65% 55%)`,
    text: `hsl(${hue} 60% 25%)`,
  };
}

/** Тёмная версия (для dark-режима) */
export function teacherColorDark(name: string): { bg: string; border: string; text: string } {
  const GOLDEN_ANGLE = 137.508;
  const hue = (hash(name) * GOLDEN_ANGLE) % 360;
  return {
    bg: `hsl(${hue} 40% 22%)`,
    border: `hsl(${hue} 60% 60%)`,
    text: `hsl(${hue} 70% 85%)`,
  };
}