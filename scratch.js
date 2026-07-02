const fs = require('fs');
const path = require('path');

const screensDir = path.join('c:', 'Users', 'vedant', 'ludocazh', 'src', 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(screensDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('Alert.alert')) {
    content = content.replace(/Alert\.alert/g, 'CustomAlert.alert');
    if (!content.includes('import CustomAlert')) {
      content = content.replace(/import\s+{([^}]*)}\s+from\s+'react-native';/, "import { $1 } from 'react-native';\nimport CustomAlert from '../components/CustomAlert';");
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', file);
  }
});
