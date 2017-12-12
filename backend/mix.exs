defmodule Backend.Mixfile do
	use Mix.Project

	def project do
	[
		app: :backend,
		version: "0.1.0",
		elixir: "~> 1.5",
		start_permanent: Mix.env == :prod,
		deps: deps()
	]
	end

	# Run "mix help compile.app" to learn about applications.
	def application do
	[
		extra_applications: [:logger],
		mod: {Backend.Application, []}
	]
	end

	# Run "mix help deps" to learn about dependencies.
	defp deps do
	[
		{:poison, "~> 3.0"},
		{:cowboy, github: "ninenines/cowboy", tag: "2.0.0"}
	]
	end
end
