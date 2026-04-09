const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && !dirPath.includes('node_modules') && !dirPath.includes('.git') && !dirPath.includes('.next')) {
            walkDir(dirPath, callback);
        } else if (!isDirectory) {
            callback(path.join(dir, f));
        }
    });
}

function replaceInFiles() {
    walkDir(__dirname, (filePath) => {
        if (!filePath.match(/\.(tsx|ts|json|prisma)$/)) return;

        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Route URL replacements
        content = content.replace(/\/concierge/g, '/white-glove');

        // Nav Key & translation key replacement
        content = content.replace(/nav\.concierge/g, 'nav.whiteGlove');
        content = content.replace(/'concierge'/g, "'whiteGlove'");
        content = content.replace(/"concierge"/g, '"whiteGlove"');
        content = content.replace(/concierge\./g, 'whiteGlove.');
        content = content.replace(/concierge: {/g, 'whiteGlove: {');

        if (filePath.includes('es.json')) {
            content = content.replace(/Concierge/g, 'Servicio White-Glove');
        } else {
            content = content.replace(/Concierge/g, 'White-Glove');
        }

        // Catch lowercase remaining text if any
        content = content.replace(/concierge team/g, 'White-Glove team');

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated: ' + filePath);
        }
    });
}

replaceInFiles();
