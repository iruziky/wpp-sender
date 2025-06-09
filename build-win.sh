#!/bin/bash
docker run --rm -v ${PWD}:/project -w /project electronuserland/builder bash -c "npm install && npm run dist -- --win"