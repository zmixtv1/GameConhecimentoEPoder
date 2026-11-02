server = orangepi
project_path = $(shell basename $(shell pwd))

rsync:
	rsync -azv --delete --exclude .git --exclude node_modules --exclude .env --exclude __pycache__ . $(server):~/docker_files/$(project_path)

# First run for setup docker compose
build: rsync
	ssh $(server) "cd ~/docker_files/$(project_path) && docker compose build"

deploy: rsync
	ssh $(server) "cd ~/docker_files/$(project_path) && docker compose up -d --build"