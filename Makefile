default: test

.PHONY: test
test: node_modules
	@echo "You must have the vagrant instance running... Run |vagrant status| if this fails"
	./node_modules/.bin/mocha $(shell find test/integration -name "*_test.js")

node_modules:
	npm install
