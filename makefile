HUGO := hugo

clean:
	-rm -rf public

dev: clean
	$(HUGO) server -w


