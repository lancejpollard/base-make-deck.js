
# Load a Link Deck in JavaScript

The input format is like this:

```json
{
  "basePath": "..",
  "load": [
    { "filePath": "../test/dock/browser", "fileType": "test" },
    { "filePath": "../test/view/example", "fileType": "view" },
  ],
  "lead": "../test/dock/browser"
}
```

The output format is a `deck` which looks like this:

```json
{
  "host": "myorg",
  "name": "mydeck",
  "basePath": "../relative/path/to/project/directory",
  "load": {
    "@myorg/mydeck/test/dock/browser": {
      "filePath": "relative/path/test/dock/browser/base.link",
      "fileType": "test",
      "text": "...content...",
      "tree": ["{...}"],
      "...": "{...}"
    },
    "@myorg/mydeck/test/view/example": {
      "filePath": "relative/path/test/view/example/base.link",
      "fileType": "test",
      "text": "...content...",
      "tree": ["{...}"],
      "...": "{...}"
    }
  },
  "lead": "@myorg/mydeck/test/dock/browser"
}
```

This way you get back `file` objects organized by key, for easy lookup.
