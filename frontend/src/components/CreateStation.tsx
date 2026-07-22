import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { schemas } from "../../generated.api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "../hooks/useApiClient"
import { useOrchards } from "@/hooks/useOrchards"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet"

function CreateStation() {
  type FormData = z.infer<typeof schemas.StationCreate>
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { data: orchards } = useOrchards()

  const form = useForm<FormData>({
    resolver: zodResolver(schemas.StationCreate),
    defaultValues: {
      name: "",
      device_id: "",
      orchard_id: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (newStation: FormData) => {
      return apiClient.createStation(newStation)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchard", "list"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="mb-4">Create a Station</SheetTitle>
        <SheetDescription asChild>
          <Form {...form}>
            <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="orchard_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orchard</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                      >
                        <option value="" disabled>
                          Select an orchard
                        </option>
                        {orchards?.map((orchard) => (
                          <option key={orchard.id} value={orchard.id}>
                            {orchard.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      This your personal name for the Device
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="device_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      This is the ID Number on you station.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        </SheetDescription>
      </SheetHeader>
    </>
  )
}

export default CreateStation
