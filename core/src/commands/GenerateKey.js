const chalk = require('chalk');
const BaseCommand = require('../packages/Console').BaseCommand;

class GenerateKey extends BaseCommand {
    commandName = 'generate:key';
    description = 'Generate a new APP_KEY secret';

    async run() {
        const secret = Math.random().toString(16).substr(2, 32);
        console.log(chalk.green(secret));

        console.log(
            chalk.gray(
                '> During development, you may want to set the above secret as "APP_KEY" inside the .env file',
            ),
        );
    }
}

exports.default = GenerateKey;
