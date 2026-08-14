#!/usr/bin/env bash

# This script creates a zip archive of the project directory.
# It excludes version control files, the 'trash' directory, and other specified items.

ARCHIVE_NAME="raspberry.zip"

echo "Creating project archive: $ARCHIVE_NAME"

# The 'zip' command will create or update the archive.
# -r: Recurse into directories.
# -x: Exclude files and directories that match the given pattern.
zip -r "$ARCHIVE_NAME" . \
    -x ".git/*" \
    -x ".gitignore" \
    -x "trash/*" \
    -x "*.zip" \
    -x "zip.sh" \
    -x "./*/.virenv/*" \
    -x "*/__pycache__/*" \
    -x "*.pyc*"

echo "Archive '$ARCHIVE_NAME' created successfully."
echo "It includes all files except for the .git folder, .gitignore, the trash/ folder, and previous zip archives."