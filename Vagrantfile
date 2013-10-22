# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  # All Vagrant configuration is done here. The most common configuration
  # options are documented and commented below. For a complete reference,
  # please see the online documentation at vagrantup.com.

  config.vm.hostname = "bz-bugzilla-test"

  # Every Vagrant virtual environment requires a box to build off of.
  config.vm.box = "bugzilla-oct21"
  config.vm.box_url = "https://dl.dropboxusercontent.com/u/26058666/bugzilla.box"
  config.vm.network :private_network, ip: "33.33.33.10"
  config.vm.network "forwarded_port", guest: 80, host: 8080
end
