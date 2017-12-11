defmodule Backend.WebsocketHandler do
	@behaviour :cowboy_websocket

	def init(req, state) do

		%{"room" => room_id, "user" => user_id} = String.split(req.qs, ["&", "="]) 
			|> Enum.chunk_every(2) 
			|> Enum.map(fn [a, b] -> {a, b} end)
			|> Map.new

		IO.inspect room_id
		IO.inspect user_id

		{:cowboy_websocket, req, %{
			room_id: room_id,
			user_id: user_id
		}}
	end

	def websocket_init(%{room_id: room_id, user_id: user_id} = state) do
		# we want to create this room if it doesn't exist.
		IO.inspect Registry.lookup(Backend.Registry, room_id)

		case Registry.lookup(Backend.Registry, room_id) do
			results when length(results) > 0 ->
				#for {pid, _} <- results, do: send(pid, {:member_join, user_id})
				{:ok, _} = Registry.register(Backend.Registry, room_id, user_id)
			[] -> 
				{:ok, _} = Registry.register(Backend.Registry, room_id, user_id)
		end

		{:ok, state}
	end
	

	def terminate(reason, _req, state) do
		IO.puts "#{state.user_id} exit"
		IO.inspect reason
		:ok
	end

	def websocket_handle({:text, content}, %{room_id: room_id, user_id: user_id} = state) do

		json = Poison.decode!(content)

		case json do
			%{ "target" => %{ "id" => target_id }} when length(target_id) > 0 -> 
				entries = Registry.lookup(Backend.Registry, room_id)
				for {pid, uid} <- entries do
					if String.equivalent?(uid, target_id) do 
						send(pid, {:direct, json})
					end
				end
			_ -> 
				entries = Registry.lookup(Backend.Registry, room_id)
				for {pid, uid} <- entries, do: send(pid, {:broadcast, json})

		end

		{ :ok, state}

	end

	def websocket_handle(_stuff, state) do
		{:ok, state}
	end

	def websocket_info({:direct, json}, state) do
		{:reply, {:text, Poison.encode!(json)}, state}
	end

	def websocket_info({:broadcast, json}, state) do
		{:reply, {:text, Poison.encode!(json)}, state}
	end

	def websocket_info({:member_join, user_id}, state) do
		{:reply, {:text, Poison.encode!(%{
			user: %{ id: user_id },
			type: "member_join"
		})}, state}
	end

	def websocket_info(_info, state) do
		IO.puts "boyooo info"
		{:ok, state}
	end
	
end