# FunC Language Support for VS Code

This extension enables support for FunC in VS Code.

## Features
### Syntax highlighting

<img width="684" src="https://user-images.githubusercontent.com/16834309/161601626-4910b474-f1d7-4eba-9702-92529832ea99.png">

### Symbols search
Press *Cmd+Shift+O* to locate through symbols in file.

<img width="646" src="https://user-images.githubusercontent.com/16834309/161601370-4257c271-c8ff-463a-8265-75d73118a9ae.png">

### Completion
Get contextual completion hints while typing. Extension shows functions defined in workspace, global and local variables. 

<img width="547" src="https://user-images.githubusercontent.com/16834309/161602498-71e1f894-8f06-4eaa-bc60-d9bcab098c56.png">

### Definitions
View definitions for function or global variable using *Cmd+Click*.

### Formatting
Format code using *Cmd+Option+F*

## Building & running

1. install deps using `yarn install`
2. run `yarn watch` in terminal
3. use debug menu in VS Code to test extension


## What to improve?
- [ ] Add project configuration file parsing (discussion of standard is [here](https://github.com/ton-blockchain/TIPs/issues/83))
- [ ] Work with includes like compiler, use entrypoints from project configuration
- [ ] Add compiler built-ins to known definitions
- [ ] Highlight unknown identifiers as errors 
- [ ] Uncover var and hole types like compiler does

## Release Notes

#### **1.0.0**
Large release supported by [ton-society](https://github.com/ton-society/ton-footsteps/issues/18) 🚀
Added new FunC syntax, formatter and improved completion. Find more at [changelog](./CHANGELOG.md).

#### **0.2.2**
Fixed autocomplete with function arguments, minor highlighting bugs.

#### **0.2.1**
Added snippets for recv_external, recv_internal, supported_interfaces.

#### **0.2.0**
Fixed bugs related with paths in Windows, fixed completion after "." and "~", added definitions.

#### **0.1.0**  
Added symbols search & completion.

#### **0.0.3**
Some minor improvements.

#### **0.0.2**
Small highlighting fixes.

#### **0.0.1**
Draft release, highlighting & basic code snippets.