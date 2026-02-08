// Design tokens for enterprise-grade UI
export const colors = {
    // Primary brand colors
    primary: {
        50: 'hsl(222, 100%, 97%)',
        100: 'hsl(222, 100%, 92%)',
        200: 'hsl(222, 96%, 84%)',
        300: 'hsl(222, 96%, 73%)',
        400: 'hsl(222, 94%, 61%)',
        500: 'hsl(222, 87%, 51%)', // Primary
        600: 'hsl(222, 87%, 41%)',
        700: 'hsl(222, 82%, 33%)',
        800: 'hsl(222, 76%, 26%)',
        900: 'hsl(222, 70%, 22%)',
        950: 'hsl(222, 76%, 14%)',
    },

    // Success green
    success: {
        50: 'hsl(142, 76%, 96%)',
        100: 'hsl(142, 77%, 89%)',
        200: 'hsl(142, 76%, 78%)',
        300: 'hsl(142, 75%, 64%)',
        400: 'hsl(142, 69%, 49%)',
        500: 'hsl(142, 76%, 38%)',
        600: 'hsl(142, 82%, 30%)',
        700: 'hsl(142, 78%, 25%)',
        800: 'hsl(142, 72%, 20%)',
        900: 'hsl(142, 67%, 17%)',
    },

    // Warning/Pending yellow
    warning: {
        50: 'hsl(45, 100%, 95%)',
        100: 'hsl(45, 100%, 90%)',
        200: 'hsl(45, 100%, 80%)',
        300: 'hsl(45, 100%, 70%)',
        400: 'hsl(45, 100%, 57%)',
        500: 'hsl(45, 93%, 47%)',
        600: 'hsl(45, 87%, 39%)',
        700: 'hsl(45, 82%, 31%)',
        800: 'hsl(45, 76%, 26%)',
        900: 'hsl(45, 71%, 22%)',
    },

    // Error/Danger red
    error: {
        50: 'hsl(0, 86%, 97%)',
        100: 'hsl(0, 93%, 94%)',
        200: 'hsl(0, 96%, 89%)',
        300: 'hsl(0, 94%, 82%)',
        400: 'hsl(0, 91%, 71%)',
        500: 'hsl(0, 84%, 60%)',
        600: 'hsl(0, 72%, 51%)',
        700: 'hsl(0, 74%, 42%)',
        800: 'hsl(0, 70%, 35%)',
        900: 'hsl(0, 63%, 31%)',
    },

    // Info blue
    info: {
        50: 'hsl(204, 100%, 97%)',
        100: 'hsl(204, 100%, 94%)',
        200: 'hsl(204, 100%, 87%)',
        300: 'hsl(204, 100%, 78%)',
        400: 'hsl(204, 98%, 67%)',
        500: 'hsl(204, 98%, 55%)',
        600: 'hsl(204, 69%, 46%)',
        700: 'hsl(204, 64%, 38%)',
        800: 'hsl(204, 61%, 32%)',
        900: 'hsl(204, 56%, 28%)',
    }
}

export const typography = {
    fontFamily: {
        sans: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
        mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
    },
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
    }
}

export const spacing = {
    px: '1px',
    0: '0px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    56: '14rem',
    64: '16rem',
}

export const borderRadius = {
    none: '0px',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
}

export const shadows = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
}

export const animations = {
    transition: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    keyframes: {
        fadeIn: {
            from: { opacity: '0' },
            to: { opacity: '1' },
        },
        slideUp: {
            from: { transform: 'translateY(10px)', opacity: '0' },
            to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
            from: { transform: 'translateY(-10px)', opacity: '0' },
            to: { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
            from: { transform: 'scale(0.95)', opacity: '0' },
            to: { transform: 'scale(1)', opacity: '1' },
        },
    }
}
