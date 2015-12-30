# versioning-file-cabinet

versioning-file-cabinet is an HTTP server that automatically tracks resource versions based on triggers from file system events of folders programmed into a `Folderfile`

        public/
        ├── .sfc
        │   ├── FILES
        │   │   ├── 00b2f3e4
        │   │   │   └── 4827c6d9
        │   │   │       └── c8be9c31
        │   │   │           └── 7e975f1e
        │   │   │               └── 1099154b
        │   │   │                   └── index.md
        │   │   ├── 1d04c9d2
        │   │   │   └── d43f7a79
        │   │   │       └── fa1d1ab9
        │   │   │           └── b2357905
        │   │   │               └── e17b7bd8
        │   │   │                   └── index.md
        │   │   └── a25c632a
        │   │       └── 2bc005dc
        │   │           └── 66a64869
        │   │               └── 3a42c379
        │   │                   └── 6f067b39
        │   │                       └── index.md
        │   └── VERSIONS
        │       └── public
        │           └── doc
        │               └── README.md
        │                   ├── 000000 -> /Users/mavenlink/workspace/versioning-file-cabinet/public/.sfc/FILES/1d04c9d2/d43f7a79/fa1d1ab9/b2357905/e17b7bd8/index.md
        │                   ├── 000001 -> /Users/mavenlink/workspace/versioning-file-cabinet/public/.sfc/FILES/00b2f3e4/4827c6d9/c8be9c31/7e975f1e/1099154b/index.md
        │                   └── 000002 -> /Users/mavenlink/workspace/versioning-file-cabinet/public/.sfc/FILES/a25c632a/2bc005dc/66a64869/3a42c379/6f067b39/index.md
        └── doc
            └── README.md -> /Users/mavenlink/workspace/versioning-file-cabinet/public/.sfc/VERSIONS/public/doc/README.md/000002

        22 directories, 7 files

## it renders markdown

    ### using marked

    ![markdown](markdown.png)

![markdown](markdown.png)
