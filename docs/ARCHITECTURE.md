# Architecture

The MV3 extension observes only supported YouTube documents. It converts navigation URLs into video IDs. Browser and desktop components share the TypeScript protocol. Media authorization belongs to the user and each request carries one ID and a bounded output profile.

The desktop companion communicates over Chromium Native Messaging. Android accepts text through the system Share Sheet. Both must enforce retrieval policy independently of the browser. Android owns MediaStore publication. The design requires no service account, backend, relay or central database.

See [threat model](THREAT_MODEL.md) for boundaries and [project status](PROJECT_STATUS.md) for what is implemented.
