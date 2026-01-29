export const theme = {
    colors: {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        primaryLight: 'bg-blue-50 text-blue-800 border-blue-200',
        secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
        accent: 'bg-orange-500 hover:bg-orange-600 text-white',
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        dangerLight: 'bg-red-50 text-red-600 border-red-100',
        success: 'bg-green-600 hover:bg-green-700 text-white',
        successLight: 'bg-green-50 text-green-800 border-green-200',
        warning: 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900',
        text: {
            main: 'text-gray-900',
            secondary: 'text-gray-500',
            label: 'text-gray-400',
            light: 'text-white'
        },
        bg: {
            main: 'bg-gray-100',
            card: 'bg-white',
            modalOverlay: 'bg-black/60'
        }
    },
    shapes: {
        rounded: 'rounded-xl',
        input: 'rounded-lg'
    },
    shadows: {
        card: 'shadow-sm',
        floating: 'shadow-xl'
    },
    animation: {
        fade: 'fade-in',
        slide: 'slide-up'
    }
};

export const buttonStyles = {
    base: `flex items-center justify-center gap-2 px-4 py-3 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${theme.shapes.rounded}`,
    primary: `${theme.colors.primary} shadow-md`,
    secondary: `border ${theme.colors.secondary} shadow-sm`,
    accent: `${theme.colors.accent} shadow-md`,
    danger: `${theme.colors.danger} shadow-md`,
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-500',
    icon: 'p-2 rounded-full hover:bg-black/5 transition'
};

export const inputStyles = {
    wrapper: 'mb-4',
    label: `block text-[10px] font-bold uppercase tracking-wider mb-1 ${theme.colors.text.label}`,
    field: `w-full border-b border-gray-300 py-2 bg-transparent text-sm ${theme.colors.text.main} focus:outline-none focus:border-blue-600 focus:bg-blue-50/20 transition-colors placeholder-gray-300`,
    selectTrigger: `w-full border-b border-gray-300 py-2 flex justify-between items-center text-sm ${theme.colors.text.main} cursor-pointer hover:bg-gray-50`
};
