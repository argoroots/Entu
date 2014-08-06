module.exports = function (grunt) {
    grunt.initConfig({
        clean: {
            build: {
                src: 'build'
            },
            postbuild: {
                src: ['build/assets']
            }
        },
        copy: {
            font_awesome: {
                cwd: 'bower_components/font-awesome',
                src: ['fonts/*.*'],
                dest: 'build',
                expand: true,
                // flatten: true,
            },
            bootstrap: {
                cwd: 'bower_components/bootstrap/dist/css/',
                src: ['bootstrap.css'],
                dest: 'build/assets/css',
                expand: true,
                // flatten: true,
            },
            deploy: {
                cwd: 'build',
                src: ['**'],
                dest: '/Users/argo/SSHFS/entu/develop/desktop',
                expand: true,
                // flatten: true,
            },
        },
        jade: {
            html: {
                options: {
                    // pretty: true,
                },
                files: [{
                    expand: true,
                    cwd: 'source/views',
                    src: ['index.jade'],
                    dest: 'build',
                    ext: '.html'
                }]
            }
        },
        stylus: {
            css: {
                files: {
                    'build/assets/css/application.css': ['source/stylesheets/*.styl']
                }
            }
        },
        less: {
            font_awesome: {
                files: {
                    'build/assets/css/font-awesome.css': ['bower_components/font-awesome/less/font-awesome.less']
                }
            }
        },
        fontAwesomeVars: {
            font_awesome: {
                variablesLessPath: 'bower_components/font-awesome/less/variables.less',
                fontPath: '/fonts'
            }
        },
        cssmin : {
            frameworks: {
                options: {
                    keepSpecialComments: 0,
                },
                files: {
                    'build/assets/css/frameworks.css': ['build/assets/css/*.css', '!build/assets/css/application.css']
                }
            },
            application: {
                options: {
                    keepSpecialComments: 0,
                },
                files: {
                    'build/assets/stylesheet.css': ['build/assets/css/frameworks.css', 'build/assets/css/application.css']
                }
            }
        },
        uglify: {
            frameworks: {
                // options: {
                //     mangle: false
                // },
                files: {
                    'build/assets/javascripts/frameworks.js': [
                        'bower_components/angular/angular.js',
                        'bower_components/angular-i18n/angular-locale_et-ee.js',
                        'bower_components/angular-route/angular-route.js',
                        'bower_components/angular-resource/angular-resource.js',
                        'bower_components/angular-sanitize/angular-sanitize.js'
                    ]
                }
            },
            application: {
                files: {
                    // 'build/assets/javascript.js': ['source/javascripts/*.js']
                    'build/assets/javascript.js': ['build/assets/javascripts/frameworks.js', 'source/javascripts/*.js']
                }
            }
        },
        includereplace: {
            all: {
                files: {
                    'build/index.html': ['build/index.html']
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 4000,
                    base: 'build',
                    hostname: 'localhost'
                }
            }
        },
        watch: {
            stylesheets: {
                files: 'source/**/*.styl',
                tasks: ['stylus', 'cssmin:application', 'jade', 'includereplace']
            },
            scripts: {
                files: 'source/**/*.js',
                tasks: ['uglify:application', 'jade', 'includereplace']
            },
            jade: {
                files: 'source/**/*.jade',
                tasks: ['jade', 'includereplace']
            },
        }
    })

    grunt.loadNpmTasks('grunt-contrib-clean')
    grunt.loadNpmTasks('grunt-contrib-connect')
    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.loadNpmTasks('grunt-contrib-cssmin')
    grunt.loadNpmTasks('grunt-contrib-jade')
    grunt.loadNpmTasks('grunt-contrib-less')
    grunt.loadNpmTasks('grunt-contrib-stylus')
    grunt.loadNpmTasks('grunt-contrib-uglify')
    grunt.loadNpmTasks('grunt-contrib-watch')
    grunt.loadNpmTasks('grunt-font-awesome-vars')
    grunt.loadNpmTasks('grunt-include-replace')

    grunt.registerTask(
        'prepare',
        'Compiles all of the assets and copies the files to the build directory.',
        ['clean:build', 'copy:font_awesome', 'copy:bootstrap', 'jade', 'stylus', 'fontAwesomeVars', 'less', 'cssmin', 'uglify', 'includereplace']
    )

    grunt.registerTask(
        'build',
        'Compiles all of the assets and copies the files to the build directory. Cleanup all mess.',
        ['prepare', 'clean:postbuild']
    )

    grunt.registerTask(
        'deploy',
        'Deploy built stuff',
        ['build', 'copy:deploy']
    )

    grunt.registerTask(
        'default',
        'Watches the project for changes, automatically builds them and runs a server.',
        ['prepare', 'connect', 'watch']
    )
}
