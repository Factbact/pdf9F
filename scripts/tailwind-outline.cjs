module.exports = {
            darkMode: 'class',
            theme: {
                colors: require('./colors.cjs'),
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', '"Outfit"', 'sans-serif'],
                        heading: ['"Outfit"', 'sans-serif'],
                    },
                    colors: {
                        dark: { bg: '#0f172a', surface: '#1e293b', border: '#334155' }
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.5s ease-out forwards',
                        'slide-up': 'slideUp 0.5s ease-out forwards',
                    },
                    keyframes: {
                        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }
                    }
                }
            }
        };
