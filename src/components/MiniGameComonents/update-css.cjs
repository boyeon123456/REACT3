const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\boyeo\\OneDrive\\Desktop\\REACT3\\src\\components\\MiniGameComonents';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.css') && file !== 'shared-minigame.css') {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // If it doesn't already import shared-minigame.css, add it
        if (!content.includes('shared-minigame.css')) {
            // For coinflip.css, we also just replace it so it uses the shared base
            if (file === 'coinflip.css') {
                content = `@import './shared-minigame.css';\n\n`;
            } else {
                content = `@import './shared-minigame.css';\n\n` + content;
            }
            fs.writeFileSync(filePath, content);
            console.log('Updated ' + file);
        }
    }
});
