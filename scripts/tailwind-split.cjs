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
                        primary: {
                            50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
                            400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
                            800: '#155e75', 900: '#164e63',
                        },
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
